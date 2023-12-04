let socket= io(window.location.origin,{ transports: ['websocket'] });
let waitingInterval;

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
        b.innerHTML = "Welcome! " + this.responseText;
      }
    }
  };
  request.open("GET", "/name");
  request.send();
}

function welcome() {
  get_username();
  updatePost();
  // updateWinner();
  // setInterval(updateWinner, 2000);
  // setInterval(updatePost, 2000);
}

window.addEventListener("click", (event) => {
  if (event.target === loginModal) {
    loginModal.style.display = "none";
  }

  if (event.target === registerModal) {
    registerModal.style.display = "none";
  }
  if (event.target === auctionModal) {
    auctionModal.style.display = "none";
  }
  if (event.target === bidModal) {
    bidModal.style.display = "none";
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
  const email = document.getElementById("email").value;

  if(username.trim() === "" || password.trim() === ""){
    showNotification("Username or Password cannot be empty", false);
    return;
  }

  let failed=sendVerificationEmail();
  if(failed===false){
    return;
  }

  const request = new XMLHttpRequest();

  request.onload = function () {
    if (request.status === 200) {
      closePage("registerModal");
      pageDisplay("VerificationModal");
      let time=60;
      waitingInterval = setInterval(function(){
      document.getElementById("waitingMessage").textContent ="Please check your email for verification link, you can resend the email in "+ time +" seconds";
      time--;
      if(time<0){
        clearInterval(waitingInterval);
        document.getElementById("waitingMessage").textContent ="you can keep waiting for the verification link or, you can resend the email now";
        document.getElementById("resendButton").removeAttribute("style");
      }
      },1000);
    } else {
      showNotification("Register Failed", false);
    }
  };

  request.open("POST", "/register");
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send(`newUsername=${username}&newPassword=${password}&email=${email}`);
}


function loginAccount() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if(username.trim() === "" || password.trim() === ""){
    showNotification("Username or Password cannot be empty", false);
    return;
  }

  const request = new XMLHttpRequest();

  request.onload = function () {
    if (request.status === 200) {
      showNotification("Login Successfully", true);
      loginModal.style.display = "none";
      document.getElementById("username").value = "";
      document.getElementById("password").value = "";
      let user_name = this.responseText;

      document.getElementById("welcome_user").innerHTML =
        "Welcome! " + user_name;
    } else if (request.status === 404) {
      showNotification("Login Failed", false);
      document.getElementById("password").value = "";
    }
  };
  request.open("POST", "/login");
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send(`username=${username}&password=${password}`);
}

//objective2
function sendVerificationEmail() {
  const email = document.getElementById("email").value;
  var emailValid = /^\w+@[a-zA-Z0-9.-]+\.\w+$/i;

  if (email.trim() === "") {
    showNotification("Email cannot be empty", false);
    return false;
  }

  if (!emailValid.test(email)) {
    showNotification("Please enter a valid email address", false);
    return false;
  }

  const request = new XMLHttpRequest();  
  
  request.onload = function () {
    if (request.status === 200) {
    }
  };

  request.open("POST", "/verification");
  request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  request.send(`email=${email}`);
}

socket.on('verification_response', function(data) {
  if (data.status === 'success') {
    let email = document.getElementById("email").value;
    let serverEmail = data.email;
    if (email === serverEmail) {
      clearInterval(waitingInterval);
      document.getElementById("closeWaitingpage").removeAttribute("style");
      document.getElementById("waitingTitle").textContent = "Email Verified";
      document.getElementById("waitingMessage").textContent = "you have successfully verified your email, you can close this page now";
      document.getElementById("resendButton").style.display = "none";
      
      document.getElementById("registerForm").reset();
    }
  }
});

function updatePost() {
  const request = new XMLHttpRequest();
  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      clearPost();
      const messages = JSON.parse(this.response);
      for (const message of messages) {
        addToPostList(message);
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

function addToPostList(auctionData) {
  var postList = document.getElementById('postList');
  var auctionItem = document.createElement('div');
  auctionItem.className = 'auction';

  var html = `
      <h3>${auctionData.title}</h3>
      <p>${auctionData.description}</p>
      <img src="${auctionData.imageURI}" alt="Auction Image">
      <p>Starting Price: $${auctionData.price}</p>
      <p>Auction Ends at: ${auctionData.duration} </p>
      <p id='current_bid-${auctionData.id}'>Current bid: $${auctionData.current_bid}</p>
      <p id='time_left-${auctionData.id}'>Time left:</p>
      <p id='winner-${auctionData.id}'style="display:none">Winner: </p>
      <p id='winning_bid-${auctionData.id}' style="display:none">Winning bid: </p>
      <button id='bidButton-${auctionData.id}' class="bid-button" onclick="prepareBidModal('${auctionData.id}', '${auctionData.owner}')">Bid</button>
  `;

  auctionItem.id = auctionData.id;
  auctionItem.innerHTML = html;
  postList.appendChild(auctionItem);
  socket.emit('timeLeft', { id: auctionData.id, duration: auctionData.duration });
}

function prepareBidModal(auctionId, auctionOwner) {
  // Set the auction item's ID and owner into the hidden inputs of the bid form
  document.getElementById("bidId").value = auctionId;
  document.getElementById("auctionOwner").value = auctionOwner;

  // Now open the bid modal
  pageDisplay('bidModal');
}



function postAuction(){
  const title = document.getElementById("auctionTitle").value;
  const description = document.getElementById("auctionDescription").value;
  const image = document.getElementById("auctionImage").files[0];
  const price = document.getElementById("startingPrice").value;
  const time = document.getElementById("auctionDuration").value;

  var formData = new FormData();

  formData.append("title", title);
  formData.append("description", description);
  formData.append("image", image);
  formData.append("price", price);
  formData.append("duration", time);

  const request = new XMLHttpRequest();

  request.open("POST", "/auction");
  request.send(formData);

  request.onreadystatechange = function () { 
    if (request.status === 200) {
      showNotification("The auction was successful.", true);
      document.getElementById("auctionForm").reset()
      closePage("auctionModal");
      socket.emit('updatePost', {});
    } else if (request.status === 404) {
      showNotification("Sorry, you cannot create auction without login", false);
    } else{
      showNotification("Please fill out all the section", false);
    }
  };
}

function updateBid(id, bid) {
document.getElementById("current_bid-" + id).textContent = "Current bid: $" + bid;

}

function bidAuction(){
  const bid = document.getElementById("bidPrice").value;
  const id = document.getElementById("bidId").value;
  const owner = document.getElementById("auctionOwner").value;
  const bidder = document.getElementById("welcome_user").innerHTML.split("!")[1].trim();

  socket.emit('bid', { id: id, bid: bid, owner: owner, bidder: bidder});
  socket.on('bid_response', function(data) {
    if (data.status === 'success_local') {
      showNotification(data.message, true);
      document.getElementById("bidForm").reset();
      closePage("bidModal");
      updateBid(data.id, data.bid)
    }else if (data.status === 'error'){
      showNotification(data.message, false);
    }
  });
}

function getAuctions() {
  const request = new XMLHttpRequest();

  request.open("GET", "/auction-history");
  request.send();

  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      const auctionData = JSON.parse(this.responseText);
      displayAuctionsInModal(auctionData, "history");
    }
  };
}

function getWins() {
  const request = new XMLHttpRequest();

  request.open("GET", "/win-history");
  request.send();

  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      const auctionData = JSON.parse(this.responseText);
      displayAuctionsInModal(auctionData, "wins");
    }
  };
}




function displayAuctionsInModal(auctionData, type) {

  let auctionListContainer = "";

  // console.log(type);

  if (type == 'history') {
    auctionListContainer = document.getElementById('myAuctionList');
  } 
  
  if (type == 'wins') {
    auctionListContainer = document.getElementById('myWinList');
  }

  auctionListContainer.innerHTML = '';

  auctionData.forEach(auction => {
      const auctionElement = document.createElement('div');
      auctionElement.className = 'auction-item';
      if (type == 'history') {
        // console.log("history")
        auctionElement.textContent = `Title: ${auction.title}, Price: ${auction.price}, Winner: ${auction.winner}`;
      } else if (type == 'wins') {
        // console.log("wins")
        auctionElement.textContent = `Title: ${auction.title}, Price: ${auction.price}, Owner: ${auction.owner}`;
      }
      auctionElement.style.border = '1px solid black';
      auctionListContainer.appendChild(auctionElement);
  });

}


socket.on('bid_response', function(data) {
  if (data.status === 'success_global') {
    updateBid(data.id, data.bid)
  }
});

socket.on('time_response', function(data) {
  if (data.status === 'keep') {
    const auctionPost = document.getElementById("time_left-" + String(data.id));
    auctionPost.textContent = `Time left: ${data.hr}hr ${data.mins}min ${data.sec}sec`;
  }else if (data.status === 'end') {
    const auctionPost = document.getElementById("time_left-" + String(data.id));
    auctionPost.textContent = `Time left: Auction Ended`;
    const bidButton = document.getElementById("bidButton-" + String(data.id));
    bidButton.style.display = "none";
  }
  
});

socket.on('winner_response', function(data) {
  const auctionPost = document.getElementById("winner-" + String(data.id));
  auctionPost.style.display = "block";
  auctionPost.textContent = `Winner: ${data.winner}`;
  const winningBid = document.getElementById("winning_bid-" + String(data.id));
  winningBid.textContent = `Winning bid: $${data.winning_bid}`;
  winningBid.style.display = "block";
});

socket.on('update_response', function() {
  updatePost();
});

