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


app = Flask(__name__,template_folder="static")
socketio = SocketIO(app, transports=['websocket'])

#REMEMBER TO CHANGE THE DATABASE NAME TO "database"
client= MongoClient("database")

client= MongoClient("localhost")

db = client["CSE312Project"]

auctionList_db = db["auctionList"]
login_info_db= db["login"]

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
        new_response.headers["Content-Type"] =file_type+"; charset=utf-8"

    else:
        new_response.headers["Content-Type"] =file_type

    return new_response
    
@app.route('/login', methods=['POST'])
def login():

    body = request.form.to_dict()
    username = body["username"]
    password = body["password"]
    user = login_info_db.find_one({"username": username})
    if user is None:
        response=make_response("User not found",404)
        return response
    if bcrypt.checkpw(password.encode(), user["password"]):
        username=html.escape(username)
        response=make_response(username,200)
        auth_token = str(random.randint(0, 999999))
        # hash token
        hashed_token = bcrypt.hashpw(auth_token.encode(), bcrypt.gensalt())
        user_id =str(uuid.uuid4())
        login_info_db.update_one({"username": username}, {"$set": {"auth_token": hashed_token, "id": user_id}})
        response.set_cookie("auth_token", auth_token,max_age=6666,httponly=True)
        response.set_cookie("id", (user_id),max_age=6666,httponly=True)
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response
    else:
        response=make_response("Wrong password",404)
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
    response=make_response("Success",200)
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response

    

@app.route('/post-history', methods = ["GET"])
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
        
        posts.append(one_post)

    post_json = json.dumps(posts)

    response=make_response(post_json, 200)
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
            response = make_response(("noImage", 404))
            return response
        
        file = request.files['image']
        suffix=file.filename[file.filename.rfind('.'):]
        file_type= MIME_TYPES.get(suffix, None)

        if file_type is not None:
            user = login_info_db.find_one({"id": request.cookies.get("id")})
            username = html.escape(user["username"])

            filename = username+file.filename.replace("../", "_").replace(" ", "_")

            if not os.path.exists(f'./static/images/{username}'):
                os.makedirs(f'./static/images/{username}')

            file.save(os.path.join('static/images/'+username, filename))

            itemTitle = request.form['title']
            itemDescription = request.form['description']
            itemPrice = request.form['price']
            itemImage = filename
            imageURI = f'./static/images/{username}/{filename}'
            id = str(uuid.uuid4())
            auctionEnd = datetime.datetime.now() + datetime.timedelta(hours=int(request.form['duration']))
            auctionEnd = auctionEnd.strftime("%m-%d-%Y %H:%M:%S")
            owner = username


            auctionList_db.insert_one({"owner":owner,"id":id,"imageURI":imageURI, "title": itemTitle, "description": itemDescription, "price": itemPrice, "image": itemImage, "duration": auctionEnd, "bids": {}})

            response = make_response(("success", 200))
            return response
        else:
            response = make_response(("wrongFileType", 404))
            return response
    
    else:
        response = make_response(("notAuthenticated", 404))
        return response

@app.route('/bid', methods=['POST'])
def addBid():
    if not isAuthenticated(request):
        response = make_response(("notAuthenticated", 404))
        return response
    
    value=int(request.form['bid'])
    id=request.form['id']
    owner=request.form['owner']

    user = login_info_db.find_one({"id": request.cookies.get("id")})
    username = html.escape(user["username"])

    if owner==username:
        response = make_response(("owner", 402))
        return response
    
    auctionItem = auctionList_db.find_one({"id": id})

    #Blow is not finished, need to check if the bid is higher than the current bid
    auctionList=auctionItem['bids']
    auctionList[username]=value

    auctionList_db.update_one({"id": id}, {"$set": {"bids": auctionList}})
    
    response = make_response(("success", 200))
    return response



if __name__ == "__main__":
    socketio.run(app, host="localhost", port=8080)


