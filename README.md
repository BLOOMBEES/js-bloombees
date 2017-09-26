y# js-bloombees

## Project requirements

 - [Node](https://nodejs.org/en/)
 - [Yarn](https://yarnpkg.com/)

### Install/Update dev tools
```
sudo npm i -g npm to update 
sudo npm install -g bower
```

### Local development
 1. `yarn` - install dependencies
 2. `yarn serve` start hacking :) it will compile the last .js in test

 
### Testing
We are developing different proof of concepts to tet js-bloombees. see test/*
```
yarn testserver
```
start testing at localhost:8001

### Deploy
1. Bee sure you increment the version in src/js-bloombees.js, bower.js and package.json
2. yarn deploy
3. git commit -a -m "Update to vX.Y.Z"
4. git tag -a X.Y.Z -m "vX.Y.Z"
5. git push


## Bower install in other projects

Third party adding js-bloombees
```
bower install js-bloombees --save
```
