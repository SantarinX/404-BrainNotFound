FROM python:3.8

ENV HOME /hw2
WORKDIR /hw2
COPY . .

RUN pip3 install -r requirements.txt

EXPOSE 8080

CMD python3 -u server.py

