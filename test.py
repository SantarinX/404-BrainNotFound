import socket

def send_attack():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect(("localhost", 8080))
    s.sendall(b"GET / HTTP/1.1 \r\n\r\n")
    print(s.recv(1024))
    s.close()




if __name__ == "__main__":
    for i in range(49):
        send_attack()
        