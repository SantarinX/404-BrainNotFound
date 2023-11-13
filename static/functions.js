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
  updateWinner();
  setInterval(updateWinner, 2000);
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

  if(username === "" || password === ""){
    showNotification("Username or Password cannot be empty", false);
    return;
  }

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

  if(username === "" || password === ""){
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
      <p id='winner-${auctionData.id}'>Winner: </p>
      <p id='winning_bid-${auctionData.id}'>Winning bid: </p>
      <button class="bid-button" onclick="prepareBidModal('${auctionData.id}', '${auctionData.owner}')">Bid</button>
  `;

  auctionItem.id = auctionData.id;
  auctionItem.innerHTML = html;
  postList.appendChild(auctionItem);
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
    } else if (request.status === 404) {
      showNotification("Sorry, you cannot create auction without login", false);
    } else{
      showNotification("Sorry, something went wrong", false);
    }
  };
}



function bidAuction(){
  var formData = new FormData();

  const bid = document.getElementById("bidPrice").value;
  const id = document.getElementById("bidId").value;
  const owner = document.getElementById("auctionOwner").value;

  formData.append("id", id);
  formData.append("bid", bid);
  formData.append("owner", owner);

  const request = new XMLHttpRequest();

  request.open("POST", "/bid");
  request.send(formData);

  request.onreadystatechange = function () { 
    if (request.status === 200) {
      showNotification("The bid was successful.", true);
      document.getElementById("bidForm").reset()
      closePage("bidModal");
    } else if (request.status === 404) {
      showNotification("Sorry, you cannot bid without login", false);
    } else if (request.status === 403) {
      showNotification("Sorry, the bid is lower the current bid", false);
    } else if(request.status ===402){
      showNotification("Sorry, you cannot bid your own auction", false);
    }else if(request.status ===401){
      showNotification("Sorry, the bid is already ended", false);
    }
  };
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

  console.log(type);

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
        console.log("history")
        auctionElement.textContent = `Title: ${auction.title}, Price: ${auction.price}, Winner: ${auction.winner}`;
      } else if (type == 'wins') {
        console.log("wins")
        auctionElement.textContent = `Title: ${auction.title}, Price: ${auction.price}, Owner: ${auction.owner}`;
      }
      auctionElement.style.border = '1px solid black';
      auctionListContainer.appendChild(auctionElement);
  });

}

function updateWinner() {
  
  const request = new XMLHttpRequest();

  request.open("GET", "/update-winner");
  request.send();

  request.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      const auctionData = JSON.parse(this.responseText);
      updateAuctionWinnerTag(auctionData);
      updateAuctionWinnerBid(auctionData);
    }
  };
}

function updateAuctionWinnerTag(auctionData) {

  auctionData.forEach(auction => {
    console.log("winner-" + String(auction.id));
    const auctionPost = document.getElementById("winner-" + String(auction.id));
    auctionPost.textContent = `Winner: ${auction.winner}`;
  });

}

function updateAuctionWinnerBid(auctionData) {

  auctionData.forEach(auction => {
    console.log("winner-" + String(auction.id));
    const auctionPost = document.getElementById("winning_bid-" + String(auction.id));
    auctionPost.textContent = `Winner bid: $${auction.winning_bid}`;
  });
}