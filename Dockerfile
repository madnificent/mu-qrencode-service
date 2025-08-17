FROM semtech/mu-javascript-template:1.9.0
LABEL maintainer="Aad Versteden <madnificent@gmail.com>"

RUN apt-get update; apt-get -y upgrade; apt-get -y install qrencode

# see https://github.com/mu-semtech/mu-javascript-template for more info
