#!/bin/bash

function require_brew(){
    BREW=`which brew`
    if [ -z $BREW ]; then
        ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)"
    fi
}

function ensure_deps_osx(){
    # ensure git installed
    GIT=`which git`
    if [ -z $GIT ]; then
        require_brew
        # install git
        brew install git
    fi

    # Node + Gulp
    NPM=`which npm | sed -e 's/\// /g' | awk '{print $NF}'`
    if [ -z $NPM ]; then
        WGET=`which wget`
        if [ -z ${WGET} ]; then
            require_brew
            # install wget
            brew install wget
        fi

        # node.js
        wget http://nodejs.org/dist/v0.10.26/node-v0.10.26.pkg -O ~/Downloads/node-v0.10.26.pkg
        sudo installer -package ~/Downloads/node-v0.10.26.pkg -target /

    fi

}

function ensure_deps_linux(){
    # ensure Linux OS is Ubuntu
    OS=`uname -a | grep ubuntu`
    if [ -z "${OS}" ]; then
        if [ -z $1 ]; then
            if [ $1 != "--force" ]; then
                echo "Ubuntu is only supported Linux platform for autobuilding the
                Composite client.\n"
                echo "If this is a Debian-based OS, you can try to force the autobuild by adding '--force' as an argument to autobuild.sh"
                exit 1
            fi
        fi
    fi

    sudo apt-get update

    # ensure git installed
    GIT=`which git`
    if [ -z ${GIT} ]; then
        sudo apt-get -y install git
    fi

    # ensure wget installed
    WGET=`which wget`
    if [ -z ${WGET} ]; then
        sudo apt-get -y install wget
    fi

    # ensure NPM is installed
    NPM=`which npm | sed -e 's/\// /g' | awk '{print $NF}'`
    if [ -z ${NPM} ]; then
        sudo apt-get -y install nodejs npm
    fi

}

# get platform and ensure dependcies are met
PLATFORM=`uname`
if [ ${PLATFORM} == "Darwin" ]; then
    ensure_deps_osx
else
    ensure_deps_linux
fi

# install gulp
sudo npm install -g gulp

# clone composite client and gulp install
git clone https://github.com/wieden-kennedy/composite-client
cd composite-client && sudo npm install
