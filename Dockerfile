FROM semtech/mu-javascript-template:feature-simplify-build-process
LABEL maintainer="Aad Versteden <madnificent@gmail.com>"

RUN apt-get update; apt-get -y upgrade; apt-get -y install qrencode

# see https://github.com/mu-semtech/mu-javascript-template for more info
