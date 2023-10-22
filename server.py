from flask import Flask, request, make_response, render_template
import uuid
from pymongo import MongoClient
import bcrypt
import random
import html
import json


app = Flask(__name__,template_folder="static")

#REMEMBER TO CHANGE THE DATABASE NAME TO "database"
client= MongoClient("database")

db = client["CSE312Project"]

logs_db = db["logs"]
login_info_db= db["login"]

MIME_TYPES = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'text/javascript',
    'jpg': 'image/jpeg',
    'ico': 'image/vnd.microsoft.icon',
    'json': 'application/json',
    'png': 'image/png'
}


@app.route("/")
def response():
    new_response = make_response(render_template("index.html"))
    new_response.headers["X-Content-Type-Options"] = "nosniff"
    new_response.headers["Content-Type"] = "text/html; charset=utf-8"
    return new_response


@app.route('/static/<path>')
def static_files(path):
    full_path = '.'+"/static/" + path
    with open(full_path, "rb") as f:
        data = f.read()
    f.close()

    new_response = make_response(data)
    new_response.headers["X-Content-Type-Options"] = "nosniff"

    if path.endswith(".css") or path.endswith('.js'):
        file_type = MIME_TYPES[path.split('.')[-1]]
        new_response.headers["Content-Type"] =file_type+"; charset=utf-8"
        return new_response
    else:
        new_response.headers["Content-Type"] = MIME_TYPES[path.split('.')[-1]]
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
        hashed_token = bcrypt.hashpw(auth_token.encode(), bcrypt.gensalt())
        user_id =str(uuid.uuid4())
        login_info_db.update_one({"username": username}, {"$set": {"auth_token": hashed_token, "id": user_id}})
        response.set_cookie("auth_token", auth_token,max_age=6666,httponly=True)
        response.set_cookie("id", (user_id),max_age=6666,httponly=True)
        print("Login successful\n")
        return response
    else:
        response=make_response("Wrong password",404)
        return response


@app.route('/register', methods=['POST'])
def register():

    body = request.form.to_dict()
    username = body["newUsername"]
    password = body["newPassword"]
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode(), salt)
    login_info_db.insert_one({"username": username, "password": hashed_password})
    response=make_response("Success",200)
    print("Register successful\n")
    return response


@app.route('/post', methods=['POST'])
def makingPost():
    body = request.form.to_dict()

    title = html.escape(body["postTitle"])
    content = html.escape(body["postContent"])

    cookies = request.cookies
    id = cookies.get("id")
    auth_token = cookies.get("auth_token") 

    if id:
        user = login_info_db.find_one({"id":id })
        if bcrypt.checkpw(auth_token.encode(), user["auth_token"]):
            username = html.escape(user["username"])
            id = str(uuid.uuid4())
            # Check start
            logs_db.insert_one({"username": username, "title": title, "content": content, "id": id, "likes": []})
            # Check end
            response=make_response("Success",200)
            return response
        else:
            response=make_response("Unauthorized",401)
            return response
    else:
        response=make_response("Unauthorized",401)
        return response
    

@app.route('/post-history', methods = ["GET"])
def showingPost():
    posts = []
    for post in logs_db.find():
        one_post = {}
        one_post['username'] = post['username']
        one_post['title'] = post['title']
        one_post['content'] = post['content']
        one_post['id'] = post['id']
        one_post['likes'] = post['likes']
        posts.append(one_post)

    post_json = json.dumps(posts)

    response=make_response(post_json, 200)
    
    print("response: ", response)
    return post_json

@app.route('/name', methods=['GET'])
def getName():
    cookies = request.cookies
    id = cookies.get("id")
    auth_token = cookies.get("auth_token")
    if id:
        user = login_info_db.find_one({"id": id})
        if user:
            if bcrypt.checkpw(auth_token.encode(), user["auth_token"]):
                username = html.escape(user["username"])
            else:
                username = "Guest"
        else:
            username = "Guest"
        
        response=make_response(username,200)
        return response
    else:
        response=make_response("Guest",200)
        return response

# Check start
@app.route('/like-post', methods=['POST'])
def likePost():
    body = request.form.to_dict()
    post_id = body["id"]

    cookies = request.cookies
    user_id = cookies.get("id")
    
    user = login_info_db.find_one({"id": user_id})
    if user is not None:

        post = logs_db.find_one({"id": post_id})

        if user_id not in post["likes"]:
            logs_db.update_one({"id": post_id}, {"$push": {"likes": user_id}})
            return make_response("Liked", 200)
        else:
            return make_response("Already liked", 403)

@app.route('/unlike-post', methods=['POST'])
def unlikePost():
    body = request.form.to_dict()
    post_id = body["id"]

    cookies = request.cookies
    user_id = cookies.get("id")

    user = login_info_db.find_one({"id": user_id})
    if user is not None:

        post = logs_db.find_one({"id": post_id})

        if user_id in post["likes"]:
            logs_db.update_one({"id": post_id}, {"$pull": {"likes": user_id}})
            return make_response("Unliked", 200)
        else:
            return make_response("Not liked before", 403)
# Check end

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)


