function pageDisplay(name) {
  document.getElementById(name).style.display = "block";
}

function closePage(name) {
  document.getElementById(name).style.display = "none";
}

function get_username() {
  const request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      var b = document.getElementById("welcome_user");
      name_user = this.responseText;
      if (name_user == "Guest") {
        b.innerHTML = "Welcome!";
      } else {
        b.innerHTML = "Welcome! " + this.responseText + " 😀";
      }
    }
  };
  request.open("GET", "/name");
  request.send();
}

function welcome() {
  get_username();
  updatePost();
  setInterval(updatePost, 2000);
}

window.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    loginModal.style.display = "none";
  }

  if (event.target === registerModal) {
    registerModal.style.display = "none";
  }
});

function showNotification(message, isSuccess) {
  notification.textContent = message;
  notification.style.backgroundColor = isSuccess ? "#4CAF50" : "#F44336";
  notification.style.display = "block";

  setTimeout(() => {
    notification.style.display = "none";
  }, 3000);
}

function registerAccount() {
  const username = document.getElementById("newUsername").value;
  const password = document.getElementById("newPassword").value;

  const request = new XMLHttpRequest();

  request.onload = function () {
    if (request.status === 200) {
      showNotification("Register Successfully", true);
      registerModal.style.display = "none";
      document.getElementById("newUsername").value = "";
      document.getElementById("newPassword").value = "";
    } else {
      showNotification("Register Failed", false);
    }
  };

  request.open("POST", "/register");
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send(`newUsername=${username}&newPassword=${password}`);
}

function loginAccount() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const request = new XMLHttpRequest();

  request.onload = function () {
    if (request.status === 200) {
      showNotification("Login Successfully", true);
      loginModal.style.display = "none";
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";

      user_name = this.responseText;

      document.getElementById("welcome_user").innerHTML =
        "Welcome! " + this.responseText + " 😀";
    } else if (request.status === 404) {
      showNotification("Login Failed", false);
      document.getElementById("password").value = "";
    }
  };
  request.open("POST", "/login");
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send(`username=${username}&password=${password}`);
}

function makingPost() {
  const desription = document.getElementById("postTitle").value;
  const content = document.getElementById("postContent").value;

  const request = new XMLHttpRequest();

  request.onload = function () {
    if (request.status === 200) {
      showNotification("Post Successfully", true);
      document.getElementById("postTitle").value = "";
      document.getElementById("postContent").value = "";
    } else {
      showNotification("Post Failed", false);
    }
  };
  request.open("POST", "/post");
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send(`postTitle=${desription}&postContent=${content}`);
}

function updatePost() {
  const request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      clearPost();
      const messages = JSON.parse(this.response);
      for (const message of messages) {
        addPostToBlock(message);
      }
    }
  };
  request.open("GET", "/post-history");
  request.send();
}

function clearPost() {
  const chatMessages = document.getElementById("postList");
  chatMessages.innerHTML = "";
}

function addPostToBlock(messageJSON) {
    const postBlocks = document.getElementById("postList");
    postBlocks.innerHTML += postHTML(messageJSON);
    postBlocks.scrollIntoView(false);
    postBlocks.scrollTop = postBlocks.scrollHeight - postBlocks.clientHeight;
}

function postHTML(postsJSON) {

    const username = postsJSON.username;
    const postTitle = postsJSON.title;
    const postContent = postsJSON.content;
    const likesCount = postsJSON.likes.length;
    
    // const username = "username";
    // const postTitle = "postTitle";
    // const postContent = "postContent";

    let postHTML = "<div style='border: thin solid black'><br><button id=" + postsJSON.id + " onclick='likePost(\"" + postsJSON.id + "\")'>Like (" + likesCount + ")</button> ";
    postHTML += "<span class='postblock' id='post" + postTitle + "'><b>" + postTitle + "</b>:<br>" + postContent + "<br>" + username + "</span></div>";
    return postHTML;
}

function likePost(postId) {
  const request = new XMLHttpRequest();

  request.onload = function () {
      if (request.status === 200) {
          updatePost();
      } else if (request.status === 403) {
          unlikePost(postId);
      }
  };

  request.open("POST", "/like-post");
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send(`id=${postId}`);
}

function unlikePost(postId) {
  const request = new XMLHttpRequest();

  request.onload = function () {
    if (request.status === 200) {
      updatePost();
    }
  };

  request.open("POST", "/unlike-post");
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send(`id=${postId}`);
}
