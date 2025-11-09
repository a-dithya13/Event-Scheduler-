// script.js -- works for index.html (login), signup.html, scheduler.html
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.split("/").pop(); // file name

  // ---- EmailJS Configuration ----
  // Replace these with your actual EmailJS credentials
  const EMAILJS_PUBLIC_KEY = "RLBL5lc7Ac43cBEGq";
  const EMAILJS_SERVICE_ID = "service_bsg0i2a";
  const EMAILJS_TEMPLATE_ID = "template_uq30f8p";

  // Initialize EmailJS
  if (typeof emailjs !== 'undefined') {
    emailjs.init(EMAILJS_PUBLIC_KEY);
  }

  // Function to send email reminder
  function sendEmailReminder(userEmail, eventTitle, eventDate, eventTime) {
    if (typeof emailjs === 'undefined') {
      console.log("EmailJS not loaded");
      return;
    }

    const templateParams = {
      to_email: userEmail,
      event_title: eventTitle,
      event_date: eventDate,
      event_time: eventTime
    };

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
      .then(function(response) {
        console.log('Email sent successfully!', response.status, response.text);
      }, function(error) {
        console.log('Failed to send email:', error);
      });
  }

  // ---- Helpers: storage ----
  const getUsers = () => JSON.parse(localStorage.getItem("users")) || [];
  const saveUsers = (u) => localStorage.setItem("users", JSON.stringify(u));

  const getEvents = () => JSON.parse(localStorage.getItem("events")) || [];
  const saveEvents = (ev) => localStorage.setItem("events", JSON.stringify(ev));

  const setCurrentUser = (user) => sessionStorage.setItem("currentUser", JSON.stringify(user));
  const getCurrentUser = () => JSON.parse(sessionStorage.getItem("currentUser"));

  // ---- SIGNUP PAGE (signup.html) ----
  if (path === "signup.html") {
    const signupBtn = document.getElementById("signupBtn");
    const nameEl = document.getElementById("signupName");
    const emailEl = document.getElementById("signupEmail");
    const passEl = document.getElementById("signupPassword");
    const confirmEl = document.getElementById("signupConfirmPassword");

    signupBtn.addEventListener("click", () => {
      const name = nameEl.value.trim();
      const email = emailEl.value.trim();
      const password = passEl.value.trim();
      const confirmPassword = confirmEl.value.trim();

      const users = getUsers();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name) {
        alert("Please enter your name.");
        return;
      }
      if (name.length < 3) {
        alert("Name must be at least 3 characters.");
        return;
      }
      if (!emailRegex.test(email)) {
        alert("Please enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        alert("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }
      if (users.some(u => u.email === email)) {
        alert("An account with this email already exists.");
        return;
      }

      const newUser = { id: Date.now(), name, email, password };
      users.push(newUser);
      saveUsers(users);
      alert("Account created successfully! Please log in.");
      window.location.href = "index.html";
    });
  }

  // ---- LOGIN PAGE (index.html) ----
  if (path === "index.html" || path === "") {
    const loginBtn = document.getElementById("loginBtn");
    const emailEl = document.getElementById("loginEmail");
    const passEl = document.getElementById("loginPassword");

    loginBtn.addEventListener("click", () => {
      const email = emailEl.value.trim();
      const password = passEl.value.trim();

      if (!email) {
        alert("Please enter your email.");
        return;
      }
      if (!password) {
        alert("Please enter your password.");
        return;
      }

      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password);

      if (!user) {
        alert("Invalid email or password!");
        return;
      }

      setCurrentUser(user);
      window.location.href = "scheduler.html";
    });
  }

  // ---- SCHEDULER (scheduler.html) ----
  if (path === "scheduler.html") {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      // Not logged in
      window.location.href = "index.html";
      return;
    }

    const logoutBtn = document.getElementById("logoutBtn");
    const addEventBtn = document.getElementById("addEventBtn");
    const titleEl = document.getElementById("eventTitle");
    const dateEl = document.getElementById("eventDate");
    const timeEl = document.getElementById("eventTime");
    const eventsList = document.getElementById("events");

    let events = getEvents(); // global events array
    // map of timers so we can clear when re-rendering
    let timers = new Map();

    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("currentUser");
      window.location.href = "index.html";
    });

    // Add event
    addEventBtn.addEventListener("click", () => {
      const title = titleEl.value.trim();
      const date = dateEl.value;
      const time = timeEl.value;

      if (!title || !date || !time) {
        alert("Please fill in all fields.");
        return;
      }

      const dt = new Date(`${date}T${time}`);
      if (isNaN(dt.getTime())) {
        alert("Invalid date/time.");
        return;
      }
      if (dt.getTime() <= Date.now()) {
        alert("Please select a future date/time.");
        return;
      }

      const newEvent = {
        id: Date.now() + Math.floor(Math.random() * 1000), // unique id
        userId: currentUser.id,
        title,
        date,
        time,
        reminderShown: false,
        startedAlertShown: false
      };

      events.push(newEvent);
      saveEvents(events);

      // reset form
      titleEl.value = "";
      dateEl.value = "";
      timeEl.value = "";

      renderEvents();
    });

    // Delete event helper
    function deleteEventById(id) {
      // clear timer if exists
      if (timers.has(id)) {
        clearInterval(timers.get(id));
        timers.delete(id);
      }
      events = events.filter(e => e.id !== id);
      saveEvents(events);
      renderEvents();
    }

    // render events for current user
    function renderEvents() {
      // clear existing timers
      timers.forEach((intervalId) => clearInterval(intervalId));
      timers.clear();

      eventsList.innerHTML = "";

      const userEvents = events
        .filter(e => e.userId === currentUser.id)
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

      if (userEvents.length === 0) {
        eventsList.innerHTML = "<p style='text-align:center;color:#555;'>No events yet. Add one!</p>";
        return;
      }

      userEvents.forEach(ev => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span>${escapeHtml(ev.title)} - ${ev.date} at ${ev.time}
            <span class="countdown" id="countdown-${ev.id}"></span>
          </span>
          <button class="delete-btn" data-id="${ev.id}">Delete</button>
        `;
        eventsList.appendChild(li);

        const delBtn = li.querySelector(".delete-btn");
        delBtn.addEventListener("click", () => {
          deleteEventById(ev.id);
        });

        startCountdown(ev);
      });
    }

    // safe escape for title output
    function escapeHtml(str) {
      return str.replace(/[&<>"']/g, function (m) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
      });
    }

    // start countdown for a single event, create timer and store in timers map
    function startCountdown(ev) {
      const el = document.getElementById(`countdown-${ev.id}`);
      if (!el) return;

      const eventTime = new Date(`${ev.date}T${ev.time}`).getTime();

      // if event already passed, show started message
      if (Date.now() >= eventTime) {
        el.textContent = " Event Started!";
        return;
      }

      // create interval
      const intervalId = setInterval(() => {
        const now = Date.now();
        const diff = eventTime - now;

        if (diff <= 0) {
          // event started
          el.textContent = " Event Started!";
          // show alert only once
          if (!ev.startedAlertShown) {
            ev.startedAlertShown = true;
            // persist flag so it doesn't repeat after reload
            events = events.map(e => e.id === ev.id ? ev : e);
            saveEvents(events);
            alert(`🔔 The event "${ev.title}" has started!`);
          }
          clearInterval(intervalId);
          timers.delete(ev.id);
          return;
        }

        // 10-minute reminder (600000 ms)
        if (diff <= 10 * 60 * 1000 && !ev.reminderShown) {
          ev.reminderShown = true;
          events = events.map(e => e.id === ev.id ? ev : e);
          saveEvents(events);
          alert(`⏰ Reminder: "${ev.title}" starts in less than 10 minutes!`);
          
          // Send email reminder
          sendEmailReminder(currentUser.email, ev.title, ev.date, ev.time);
        }

        // calculate display values
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // show nicely (omit 0d if days=0)
        const parts = [];
        if (days) parts.push(`${days}d`);
        parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        parts.push(`${seconds}s`);
        el.textContent = " (" + parts.join(" ") + ")";

      }, 1000);

      // store timer so we can clear later
      timers.set(ev.id, intervalId);
    }

    // initial render
    renderEvents();
  }
});