from flask import Flask, request, make_response, render_template
from flask_socketio import SocketIO, send, emit
import bcrypt
import random
import html
import json
import os
from pymongo import MongoClient
import uuid
import datetime



app = Flask(__name__, template_folder="static")

app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, transports=['websocket'],cors_allowed_origins="*")

client= MongoClient("database")

# client = MongoClient("localhost")

db = client["CSE312Project"]

auctionList_db = db["auctionList"]
login_info_db = db["login"]

MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.jpg': 'image/jpeg',
    '.ico': 'image/vnd.microsoft.icon',
    '.json': 'application/json',
    '.png': 'image/png'
}


def isAuthenticated(Request):
    cookies = Request.cookies
    id = cookies.get("id")
    auth_token = cookies.get("auth_token")

    if id and auth_token:
        user = login_info_db.find_one({"id": id})
        if user and bcrypt.checkpw(auth_token.encode(), user["auth_token"]):
            return True
    return False


@app.route("/")
def response():
    new_response = make_response(render_template("index.html"))
    new_response.headers["X-Content-Type-Options"] = "nosniff"
    new_response.headers["Content-Type"] = "text/html; charset=utf-8"
    return new_response


@app.route('/static/<subpath>')
def static_files(subpath):
    path = os.path.normpath(subpath)

    full_path = './static/' + path

    if not os.path.exists(full_path) or not full_path.startswith('./static'):
        return make_response("File not found", 404)

    with open(full_path, "rb") as f:
        data = f.read()
    f.close()

    new_response = make_response(data)
    new_response.headers["X-Content-Type-Options"] = "nosniff"

    file_type = MIME_TYPES[path[path.rfind('.'):]]

    if file_type is None:
        return make_response("File not found", 404)

    if path.endswith(".css") or path.endswith('.js'):
        new_response.headers["Content-Type"] = file_type + "; charset=utf-8"

    else:
        new_response.headers["Content-Type"] = file_type

    return new_response


@app.route('/login', methods=['POST'])
def login():
    body = request.form.to_dict()
    username = body["username"]
    password = body["password"]
    user = login_info_db.find_one({"username": username})
    if user is None:
        response = make_response("User not found", 404)
        return response
    if bcrypt.checkpw(password.encode(), user["password"]):
        username = html.escape(username)
        response = make_response(username, 200)
        auth_token = str(random.randint(0, 999999))
        # hash token
        hashed_token = bcrypt.hashpw(auth_token.encode(), bcrypt.gensalt())
        user_id = str(uuid.uuid4())
        login_info_db.update_one({"username": username}, {"$set": {"auth_token": hashed_token, "id": user_id}})
        response.set_cookie("auth_token", auth_token, max_age=6666, httponly=True)
        response.set_cookie("id", (user_id), max_age=6666, httponly=True)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response
    else:
        response = make_response("Wrong password", 404)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response


@app.route('/register', methods=['POST'])
def register():
    body = request.form.to_dict()
    username = body["newUsername"]
    password = body["newPassword"]
    # hash password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode(), salt)
    login_info_db.insert_one({"username": username, "password": hashed_password})
    response = make_response("Success", 200)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

@app.route('/post-history', methods=["GET"])
def showingPost():
    posts = []
    for post in auctionList_db.find():
        one_post = {}
        one_post['title'] = post['title']
        one_post['description'] = post['description']
        one_post['image'] = post['image']
        one_post['price'] = post['price']
        one_post['imageURI'] = post['imageURI']
        one_post['duration'] = post['duration']
        one_post['owner'] = post['owner']
        one_post['id'] = post['id']
        one_post['bids'] = post['bids']
        one_post['winner'] = post['winner']
        one_post['winning_bid'] = post['winning_bid']
        one_post['current_bid'] = post['current_bid']

        posts.append(one_post)

    post_json = json.dumps(posts)

    response = make_response(post_json, 200)
    response.headers["X-Content-Type-Options"] = "nosniff"

    return response


@app.route('/name', methods=['GET'])
def getName():
    if isAuthenticated(request):
        user = login_info_db.find_one({"id": request.cookies.get("id")})

        username = html.escape(user["username"])
        response = make_response(username, 200)

    else:
        response = make_response("Guest", 200)

    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.route('/auction', methods=['POST'])
def saveAuction():
    if isAuthenticated(request):
        if 'image' not in request.files:
            response = make_response(("noImage", 402))
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.status_code = 402
            return response

        file = request.files['image']
        suffix = file.filename[file.filename.rfind('.'):]
        file_type = MIME_TYPES.get(suffix, None)

        if file_type is not None:
            user = login_info_db.find_one({"id": request.cookies.get("id")})
            username = html.escape(user["username"])

            filename = username + file.filename.replace("../", "_").replace(" ", "_")

            if not os.path.exists(f'./static/images/{username}'):
                os.makedirs(f'./static/images/{username}')

            file.save(os.path.join('static/images/' + username, filename))

            itemTitle = html.escape(request.form['title'])
            itemDescription = html.escape(request.form['description'])
            itemPrice = html.escape(request.form['price'])
            itemImage = html.escape(filename)
            imageURI = f'./static/images/{username}/{filename}'
            id = str(uuid.uuid4())
            auctionEnd = datetime.datetime.now() + datetime.timedelta(minutes=int(request.form['duration']))
            auctionEnd = auctionEnd.strftime("%m-%d-%Y %H:%M:%S")
            owner = username

            auctionList_db.insert_one(
                {"owner": owner, "id": id, "imageURI": imageURI, "title": itemTitle, "description": itemDescription,
                 "price": itemPrice, "image": itemImage, "duration": auctionEnd, "bids": {}, "winner": "", "winning_bid":"", "current_bid": itemPrice})

            response = make_response(("success", 200))
            return response
        else:
            response = make_response(("wrongFileType", 403))
            response.headers["X-Content-Type-Options"] = "nosniff"
            response.status_code = 403
            return response

    else:
        response = make_response(("notAuthenticated", 404))
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.status_code = 404
        return response

@socketio.on('updatePost')
def handle_update(json):
    emit('update_response', {}, broadcast=True)



@socketio.on('bid')
def handle_bid(json):
    item_id = json['id']
    bid = int(json['bid'])
    bidder = json['bidder']

    item = auctionList_db.find_one({"id": item_id})
    owner = item['owner']
    
    current_time = datetime.datetime.now()
    auction_end = datetime.datetime.strptime(item['duration'], "%m-%d-%Y %H:%M:%S")
    
    if bidder == owner:
        emit('bid_response', {'status': 'error', 'message': 'You cannot bid on your own item'})
        return
    
    if current_time > auction_end:
        emit('bid_response', {'status': 'error', 'message': 'Auction has ended'})
        return
    
    highest_bid = max(item['bids'].values(), default=int(item['price']))
    if bid <= highest_bid:
        emit('bid_response', {'status': 'error', 'message': 'Bid must be higher than current bid'})
        return
    
 
    
    bids = item['bids']
    bids[bidder] = bid
    auctionList_db.update_one({"id": item_id}, {"$set": {"bids": bids, "current_bid": bid, "winner": bidder, "winning_bid": bid}})

    emit('bid_response', {'status': 'success_global', 'message': 'Bid received', 'id': item_id, 'bid': bid, 'bidder': bidder}, broadcast=True)
    emit('bid_response', {'status': 'success_local', 'message': 'Bid received', 'id': item_id, 'bid': bid, 'bidder': bidder})


@socketio.on('timeLeft')
def handle_time(json):
    item_id = json['id']
    item = auctionList_db.find_one({"id": item_id})

    current_time = datetime.datetime.now()
    auction_end = datetime.datetime.strptime(item['duration'], "%m-%d-%Y %H:%M:%S")
    time_left = (auction_end - current_time).total_seconds()

    while True:
        if time_left <= 0:
            handle_winner(json)
            emit('time_response', {'status':'end','id': item_id}, broadcast=True)
            break

        current_time = datetime.datetime.now()
        auction_end = datetime.datetime.strptime(item['duration'], "%m-%d-%Y %H:%M:%S")

        time_left = auction_end - current_time
        time_left = time_left.total_seconds()

        hours = str(int(time_left // 3600))
        minutes = str(int((time_left % 3600) // 60))
        seconds = str(int(time_left % 60))

        emit('time_response', {'status':'keep','hr': hours,'mins':minutes,'sec':seconds, 'id': item_id}, broadcast=True)
        socketio.sleep(1)



def handle_winner(json):
    item_id = json['id']
    item = auctionList_db.find_one({"id": item_id})

    winner= item['winner']
    winning_bid = item['winning_bid']

    emit('winner_response', {'winner':winner,'winning_bid':winning_bid,'id': item_id}, broadcast=True)



@app.route('/auction-history', methods=['GET'])
def getAuctionHistory():
    if not isAuthenticated(request):
        response = make_response(("notAuthenticated", 404))
        return response

    user = login_info_db.find_one({"id": request.cookies.get("id")})
    username = html.escape(user["username"])

    auctionList = []
    for auctionItem in auctionList_db.find({"owner": username}):
        auctionList.append(auctionItem)

    auctionList_json = json.dumps(auctionList, default=str)

    response = make_response(auctionList_json, 200)
    response.headers["X-Content-Type-Options"] = "nosniff"

    return response



@app.route('/win-history', methods=['GET'])
def getWinHistory():
    if not isAuthenticated(request):
        response = make_response(("notAuthenticated", 404))
        return response

    user = login_info_db.find_one({"id": request.cookies.get("id")})
    username = html.escape(user["username"])

    auctionList = []
    for auctionItem in auctionList_db.find({"winner": username}):
        auctionList.append(auctionItem)

    auctionList_json = json.dumps(auctionList, default=str)

    response = make_response(auctionList_json, 200)
    response.headers["X-Content-Type-Options"] = "nosniff"

    return response



def auction_winner(auctionItem):
    if auctionItem['bids']:
        highest_bid = max(auctionItem['bids'], key=auctionItem['bids'].get)
        auctionList_db.update_one(
            {"id": auctionItem['id']},
            {"$set": {"winner": highest_bid, "winning_bid": auctionItem['bids'][highest_bid]}}
        )
    else:
        auctionList_db.update_one(
            {"id": auctionItem['id']},
            {"$set": {"winner": None, "winning_bid": None}}
        )

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8080)