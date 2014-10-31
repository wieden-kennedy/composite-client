#!/bin/bash

GIT=`which git`
if [ -z $GIT ]; then
  BREW=`which brew`
  if [ -z $BREW ]; then
    ruby -e "$(curl -fsSL https://raw.github.com/Homebrew/homebrew/go/install)"
  fi

  # install git
  brew install git
fi

# Node + Gulp
NPM=`which npm | sed -e 's/\// /g' | awk '{print $NF}'`
if [ -z $NPM ]; then
  # node.js
  wget http://nodejs.org/dist/v0.10.26/node-v0.10.26.pkg -O ~/Downloads/node-v0.10.26.pkg
  sudo installer -package ~/Downloads/node-v0.10.26.pkg -target /
fi

# install gulp
npm install gulp


# download and install client framework
git clone https://github.com/wieden-kennedy/composite-client.git
cd composite-client && npm install

