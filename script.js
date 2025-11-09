

document.addEventListener("DOMContentLoaded", function() {

  const path = window.location.pathname.split("/").pop(); // current page

  // email js
  const EMAILJS_PUBLIC_KEY="RLBL5lc7Ac43cBEGq";
  const EMAILJS_SERVICE_ID="service_bsg0i2a";
  const EMAILJS_TEMPLATE_ID="template_uq30f8p";

  if (typeof emailjs !== "undefined") 
    {
     emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  // send email reminders
  function sendEmailReminder(userEmail, title, date, time) {
    if (typeof emailjs === "undefined") 
    {
      console.log("EmailJS not loaded");
      return;
    }

    const templateParams= {
      to_email:userEmail,
       event_title:title,
    event_date:date,
      event_time:time
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams).then(function(response)
     {
        console.log("Email sent!", response.status);
      }) .catch(function(error)
       {
        console.log("Email failed:", error);
      });
  }

  // simple localStorage 
  const getUsers=() => JSON.parse(localStorage.getItem("users")) || [];

   const saveUsers= users => localStorage.setItem("users",JSON.stringify(users));

  const getEvents=() => JSON.parse(localStorage.getItem("events")) || [];
  const saveEvents= events => localStorage.setItem("events",JSON.stringify(events));

  const setCurrentUser= user => sessionStorage.setItem("currentUser",JSON.stringify(user));
   const getCurrentUser= () => JSON.parse(sessionStorage.getItem("currentUser"));

  //signup page 
  if (path === "signup.html") {
    const signupBtn=document.getElementById("signupBtn");
    const nameEl=document.getElementById("signupName");
    const emailEl=document.getElementById("signupEmail");
    const passEl=document.getElementById("signupPassword");
    const confirmEl=document.getElementById("signupConfirmPassword");

    signupBtn.addEventListener("click", function() {
      const name =nameEl.value.trim();
       const email=emailEl.value.trim();
       const password=passEl.value.trim();
       const confirmPassword=confirmEl.value.trim();

      const users = getUsers();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name)
         return alert("Please enter your name.");
      
      if (name.length < 3) 
        return alert("Name must be at least 3 characters.");
      
      if (!emailRegex.test(email)) 
        return alert("Please enter a valid email.");
      
      if (password.length < 8) 
        return alert("Password must be at least 8 characters.");
      if (password !== confirmPassword) 
        return alert("Passwords do not match.");
      if (users.some(u => u.email === email)) return alert("This email is already registered.");

      const newUser= { id: Date.now(), name, email, password };
      users.push(newUser);
      saveUsers(users);

      alert("Account created! Please log in.");

      window.location.href="index.html";
    });
  }

  //  login page 
  if (path === "index.html" || path === "") {
    const loginBtn=document.getElementById("loginBtn");
     const emailEl=document.getElementById("loginEmail");
    
     const passEl=document.getElementById("loginPassword");

    loginBtn.addEventListener("click", function() {
      const email= emailEl.value.trim();
      const password= passEl.value.trim();

      if (!email) 
        return alert("Please enter your email.");
      if (!password) 
        return alert("Please enter your password.");

      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password);

      if (!user) return alert("Invalid email or password!");

      setCurrentUser(user);
      window.location.href = "scheduler.html";
    });
  }

  //  scheduler page 
  if (path === "scheduler.html") {

    const currentUser= getCurrentUser();
    if (!currentUser) {
      window.location.href="index.html";
      return;
    }

    const logoutBtn=document.getElementById("logoutBtn");
    const addEventBtn=document.getElementById("addEventBtn");
    const titleEl =document.getElementById("eventTitle");
     const dateEl= document.getElementById("eventDate");
     const timeEl = document.getElementById("eventTime");
    const eventsList=document.getElementById("events");

    let events=getEvents();
    let timers= new Map();

    logoutBtn.addEventListener("click", function() {
      sessionStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });

    addEventBtn.addEventListener("click", function() {
      const title=titleEl.value.trim();
      const date= dateEl.value;
      const time=timeEl.value;

      if (!title || !date || !time) 
        return alert("Please fill in all fields.");

      const eventDateTime = new Date(`${date}T${time}`);

      if (isNaN(eventDateTime.getTime())) 
        return alert("Invalid date/time.");
      
      if (eventDateTime.getTime() <= Date.now()) 
        
        return alert("Please select a future date/time.");

      const newEvent=  {
        id: Date.now() + Math.floor(Math.random()*1000),
        userId: currentUser.id,
        title,
         date,
         time,
         reminderShown: false,
        startedAlertShown: false
      };

       events.push(newEvent);
      
       saveEvents(events);

       titleEl.value="";
      
       dateEl.value = "";
      timeEl.value ="";

      renderEvents();

    });

    function deleteEventById(id) {
      if (timers.has(id)) {
        clearInterval(timers.get(id));
        timers.delete(id);
      }

      events = events.filter(e => e.id !== id);
      saveEvents(events);
      renderEvents();
    }

    function renderEvents() {
      timers.forEach(clearInterval);
      timers.clear();
      eventsList.innerHTML ="";

      const userEvents = events.filter(e => e.userId === currentUser.id).sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

      if (userEvents.length === 0) {
        eventsList.innerHTML = "<p style='text-align:center;color:#555;'>No events yet. Add one!</p>";
        return;
      }

      userEvents.forEach(function(eventItem) {
        const li = document.createElement("li");
        li.innerHTML = `<span>${escapeHtml(eventItem.title)} - ${eventItem.date} at ${eventItem.time}<span class="countdown" id="countdown-${eventItem.id}"></span>
          </span>
          <button class="delete-btn" data-id="${eventItem.id}">Delete</button>
        `;

        eventsList.appendChild(li);

        li.querySelector(".delete-btn").addEventListener("click", function() {
          deleteEventById(eventItem.id);
        });

        startCountdown(eventItem);
      });
    }

    function escapeHtml(str) {
      return str.replace(/[&<>"']/g, function(m) {
        return { "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m];
      });
    }

    function startCountdown(eventItem) {
      const countdownEl=document.getElementById(`countdown-${eventItem.id}`);
      if (!countdownEl) return;

      const eventTime=new Date(`${eventItem.date}T${eventItem.time}`).getTime();

      if (Date.now() >= eventTime) {
        countdownEl.textContent = " Event Started!";
        return;
      }

      const intervalId=setInterval(function() {
        const now=Date.now();
        const diff=eventTime - now;

        if (diff <= 0) {
          countdownEl.textContent = " Event Started!";
          if (!eventItem.startedAlertShown) {
            eventItem.startedAlertShown = true;
            events = events.map(e => e.id===eventItem.id?eventItem:e);
            saveEvents(events);
            alert(`🔔 The event "${eventItem.title}" has started!`);
          }
          clearInterval(intervalId);
          timers.delete(eventItem.id);
          return;
        }


        if (diff <= 10*60*1000 && !eventItem.reminderShown) {
          eventItem.reminderShown = true;

           events=events.map(e => e.id===eventItem.id?eventItem:e);
           saveEvents(events);

          alert(`⏰ Reminder: "${eventItem.title}" starts in less than 10 minutes!`);

           sendEmailReminder(currentUser.email, eventItem.title, eventItem.date, eventItem.time);
        }

        const days= Math.floor(diff/(1000*60*60*24));
        const hours =Math.floor((diff%(1000*60*60*24))/(1000*60*60));
        
        const minutes=Math.floor((diff%(1000*60*60))/(1000*60));
         
         const seconds=Math.floor((diff%(1000*60))/1000);
       const parts= [];
        if (days) parts.push(`${days}d`);
         parts.push(`${hours}h`);
         parts.push(`${minutes}m`);
         parts.push(`${seconds}s`);

        countdownEl.textContent="(" + parts.join(" ") + ")";
      }, 1000);
    timers.set(eventItem.id, intervalId);
    }
   renderEvents();
  }
});
