angular.module('app.user', ['app.services'])

.controller('HomeController', function($scope, $location, UserInfo, $rootScope, $timeout, $interval, $cookies) {

  //length of round in seconds
  var roundLength = 7;
  var goodJob = new Audio('../../audio/goodJob.wav');
  var denied = new Audio('https://www.freesound.org/data/previews/249/249300_4404552-lq.mp3');


  //Passing data from the UserInfo factory
  $scope.user = UserInfo.user;
  $scope.avatar = UserInfo.user.avatar;
  $scope.rooms = UserInfo.rooms;
  $scope.currentRoom = UserInfo.currentRoom;
  $scope.activeUsers = [];
  $scope.newPlayer = {};


  console.log("user is: ", $scope.user);
  console.log("rooms is: ", $scope.rooms);
  console.log("currentRoom is: ", $scope.currentRoom);
  console.log("activeUsers is: ", $scope.activeUsers);
  console.log("newPlayer is: ", $scope.newPlayer);

  $scope.goToRoom = function(roomName) {
    $scope.wipeReady($scope.user.username);
    $scope.currentRoom = UserInfo.getRoom(roomName);
    console.log('timer', timer);
    if (timer) {
      $interval.cancel(timer);
    }
  };

  $scope.addRoom = function(newRoomName) {
    UserInfo.addNewRoom(newRoomName);
    $scope.activeUsers.push($scope.user.username);
    $scope.clear();
    console.log('timer', timer);
    if (timer) {
      $interval.cancel(timer);
    }
  };

  $scope.clear = function() {
    console.log("clear getting called");
    $scope.newRoomName = null;
    $scope.newPlayer = {};
  }

  $scope.addPlayer = function(newPlayerUsername) {
    var roomname = $scope.currentRoom.roomname;
    UserInfo.addNewPlayer(roomname, newPlayerUsername);
    $scope.clear();
  };

  $scope.playerReady = function() {
    UserInfo.playerReady();
  };

  $scope.startGame = function() {
    UserInfo.startNewGame();
    console.log($scope.currentRoom);
  };

  $scope.weReady = function(){
    //Check to see if ALL players are ready
    var allReady = $scope.currentRoom.users.every(user => user.ready);

    console.log("YO! Are we ready??? ", allReady)
    if(allReady) {$scope.startGame();}

  };

  $scope.wipeReady = function(username){
    if(username){
      let index = findIndexAtProp($scope.currentRoom.users, 'username', username);
      if(index){
        $scope.currentRoom.users[index].ready = false;
      }
    } else {
    $scope.currentRoom.users.forEach(user=> user.ready = false);
    }
  };



  $scope.on = UserInfo.on;
  $scope.removeActiveUser = UserInfo.removeActiveUser
  $scope.invitedToNewRoom = UserInfo.invitedToNewRoom
  $scope.addActiveUser = UserInfo.addActiveUser


//SOCKET.IO EVENT LISTENNERS//
  $scope.on('PlayerAdded', function(room, newPlayerUsername) {
    //Making sure we are on the right user/socket before we update the view
    if ($scope.currentRoom.roomname === room.roomname) {
      $scope.currentRoom = UserInfo.currentRoom;
    }
    if (newPlayerUsername === UserInfo.user.username) {
      $scope.rooms[room.roomname] = UserInfo.addedToNewRoom(room);
    }

  });

  $scope.on('SendQuestions', function(questions) {
    console.log('questions', questions);
    $location.path('/home/game');
    $rootScope.questionSet = questions;
    $scope.startingGame();
  });

  $scope.on('newUserSignedUp', function(data) {
    console.log(data.username, ' got connected');
  });

  $scope.on('UserLeft', function(username) {
    console.log(username, ' has left the room');
    var index = $scope.activeUsers.indexOf(username);
    $scope.activeUsers.splice(index, 1);
    //index = $scope.currentRoom.users.reduce((a, b, i) => b.username === username ? i : -1, -1);
    //$scope.currentRoom.users.splice(index, 1);

    $scope.wipeReady(username);
    // $scope.removeActiveUser(username);
  });

 $scope.on('UserJoined', function(username, avatar, activeUsers) {
   console.log('avatar1', avatar);
    if (username === $scope.user.username) {
      $scope.activeUsers = activeUsers;
      console.log(activeUsers, ' are in the room');
    } else {
      $scope.activeUsers.push(username);
      console.log(username, ' has joined the room');
    }
      if ($scope.currentRoom.users.filter(user => user.username === username).length === 0) {
        console.log('avatar2',avatar);
        $scope.currentRoom.users.push({username: username, avatar: avatar, score: 0});
      }
  });

  $scope.on('InvitetoNewRoom', function(roomInfo) {
    $scope.invitedToNewRoom(roomname);
  });

  $scope.on('UpdateScores', function() {
    UserInfo.updateAllScores();
  });

  function findIndexAtProp(arr, key, val) {
    for(var i in arr) {
      if(arr[i][key] === val) {
        return i;
      }
    }
    return null;
  }


  $scope.on('playerReady', function(username){
    $scope.currentRoom = UserInfo.currentRoom;
    console.log(username," is ready!!!");
    console.log('currentRoom', $scope.currentRoom);
    let index = findIndexAtProp($scope.currentRoom.users, 'username', username);
    if($scope.currentRoom.users[index].ready === true) {
      $scope.currentRoom.users[index].ready = false;
    } else {
      $scope.currentRoom.users[index].ready = true;
    }
    // setTimeout(function(){$scope.weReady();}, 2000);
    // setTimeout takes too long for testing purposes
    $scope.weReady();

  });


//////////////////////////////

/////GAME HAMDLING/////


  $scope.startingGame = function() {
    if ($scope.gameState && !$scope.gameState.gameFinished) {
      return;
    }
    $scope.wipeReady();
    $scope.user.score = 0;
    var roundDuration = roundLength * 1000;
    $scope.gameState = _resetGameState();
    $scope.gameState.questionsAttempted = 1;
    $scope.activeUsers.forEach(user => $scope.gameState.scoreBoard[user] = {username: user, score: 0});
    var mathRandom = Math.random() * 1000;
    var timer = $interval(function() {
      $scope.gameState.timer -= 1;
    }, 1000);

    $scope.on('correctAnswer', function(user, score) {
      $scope.gameState.scoreBoard[user].score = score;
      $scope.fireworks = {"background" : "url('../../styles/giphy.gif')"};
      setTimeout(function(){$scope.fireworks = {"background" : ""};}, 1000);
      if ($scope.user.username !== user) {
        _someoneElseGotCorrectAnswer(user);
      }
    });

    $scope.on('incorrectAnswer', function(username) {
      if ($scope.user.username !== username) {
        _someoneElseScrewedUp(username);
      }

    $scope.on('alertPowerUp', function(username) {
      if ($scope.user.username !== username) {
        _youGotAlerted(username);
      }
    })

    $scope.on('blankPowerUp', function(username) {
      if ($scope.user.username !== username) {
        _youGotBlanked(username);
      }
    })

    $scope.on('blackoutPowerUp', function(username) {
      if($scope.user.username !== username) {
        console.log("scope on blackout");
        _youGotBlackedOut(username);
      }
    })

    });

//have to be nested, in order to get the questionSet first
    // UserInfo.playGame(handleRoundEnd, handleGameEnd);

//function is called at the end of every round
    function handleRoundEnd(callback) {
      $scope.gameState.timer = roundLength;
      $scope.gameState.questionsAttempted++;
      // sets powerup streaks to zero when you don't answer a question
      if($scope.gameState.isCorrect === 'pending' || $scope.gameState.isCorrect === 'ganked'){
        console.log('getting inside the pending');
        $scope.gameState.consecutive1 = 0;
        $scope.gameState.consecutive2 = 0;
        $scope.gameState.consecutive3 = 0;
      }
      $scope.gameState.isCorrect = 'pending';
      $scope.gameState.gotGanked = false;
      $scope.gameState.othersWhoScrewedUp = [];
      $scope.gameState.index = false;
      callback();
    }

//function is called at the end of every game
    function handleGameEnd() {
      $scope.gameState.isCorrect = 'pending';
      $interval.cancel(timer);
      $timeout(function() {
        UserInfo.sendScore($scope.gameState.numCorrect * 100);
        console.log('mathRandom: ', mathRandom);
      }, mathRandom);
    }

//resets the game state to the initial values. called at the start of every game
    function _resetGameState() {
      return {
        index: -1,
        isCorrect: 'pending',
        consecutive1: 0,
        consecutive2: 0,
        consecutive3: 0,
        numCorrect: 0,
        gotGanked: false,
        othersWhoScrewedUp: [],
        questionsAttempted: 1,
        gameFinished: false,
        timer: roundLength,
        scoreBoard: {}
      };
    }

    function _someoneElseGotCorrectAnswer(user) {
      $scope.gameState.gotGanked = user.username;
      setTimeout(function(){$scope.gameState.gotGanked = false;}, 1000);
      $scope.gameState.isCorrect = 'ganked';
    }

    function _someoneElseScrewedUp(username) {
      if ($scope.user.username) {
        $scope.gameState.othersWhoScrewedUp.push(username);
        console.log($scope.gameState.othersWhoScrewedUp);
      }
    }

    function _youGotAlerted(username) {
      $scope.gameState.isCorrect = 'disabled';
      setTimeout(function(){$scope.gameState.isCorrect = 'pending'}, 1000);
    }

    function _youGotBlanked(username) {
      $scope.gameState.hideQ = {state: true, user: username};
      setTimeout(function(){$scope.gameState.hideQ = {state: false, username: ''}}, 3000);
    }

    function _youGotBlackedOut(username) {
      console.log("Black out getting called");
      $scope.blackout = {state: true, user: username};
      setTimeout(function(){$scope.blackout = {state: false, user: ''}}, 5000);
    }

    function _startTimer(roundDuration) {
      $timeout(function() {
        handleRoundEnd(gameStart);

        if ($scope.gameState.questionsAttempted === 11) {
          $scope.gameState.gameFinished = true;
        }

      }, roundDuration);
    }

    function gameStart() {
      if ($scope.gameState.questionsAttempted < 11) {
        _startTimer(roundDuration);
      } else {
        handleGameEnd();
      }
    }
    gameStart();
  };

//when user submits an answer, checks to see if it is the right answer.
  $scope.submitAnswer = function() {
    var questionIndex = $scope.gameState.questionsAttempted - 1;
    var activeQuestion = $rootScope.questionSet[questionIndex];
    var isCorrect = activeQuestion.answerChoices[$scope.gameState.index] === activeQuestion.correct_answer;

    if (isCorrect) {
      goodJob.play();
      $scope.gameState.numCorrect++;
      $scope.gameState.isCorrect = 'yes';
      $scope.gameState.consecutive1++;
      $scope.gameState.consecutive2++;
      $scope.gameState.consecutive3++;
      console.log('1', $scope.gameState.consecutive1);
      console.log('2', $scope.gameState.consecutive2);
      console.log('3', $scope.gameState.consecutive3);
      console.log($scope.gameState.consecutive);
      if($scope.gameState.consecutive1 > 0) {
        $scope.gameState.alertPowerUp = true;
      }
      if($scope.gameState.consecutive2 > 1) {
        $scope.gameState.blankPowerUp = true;
      }
      if($scope.gameState.consecutive3 > 2) {
        $scope.gameState.blackoutPowerUp = true;
      }
      UserInfo.correctAnswer($scope.user.username, $scope.currentRoom.roomname);
      UserInfo.sendScore(100);
    } else {
      denied.play();
      $scope.gameState.isCorrect = 'no';
      $scope.gameState.consecutive1 = 0;
      $scope.gameState.consecutive2 = 0;
      $scope.gameState.consecutive3 = 0;
      UserInfo.incorrectAnswer($scope.user.username, $scope.currentRoom.roomname);
    }

    $scope.clear();
  };

  $scope.signOut = function(){
    console.log("I am getting called");
    $cookies.put('username', '');
    $location.path('/signin');
  };

  $scope.alertPowerUp = function(){
    UserInfo.alertPowerUp($scope.user.username, $scope.currentRoom.roomname);
    $scope.gameState.alertPowerUp = false;
  };

  $scope.blankPowerUp = function(){
    $scope.gameState.consecutive2 = 0;
    console.log($scope.gameState.consecutive2);
    UserInfo.blankPowerUp($scope.user.username, $scope.currentRoom.roomname);
    $scope.gameState.blankPowerUp = false;
  };

  $scope.blackoutPowerUp = function(){
    $scope.gameState.consecutive3 = 0;
    UserInfo.blackoutPowerUp($scope.user.username, $scope.currentRoom.roomname);
    $scope.gameState.blackoutPowerUp = false;
  }

///////////////////////

});
