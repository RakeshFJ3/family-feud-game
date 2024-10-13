
//Initializing firebase references

// Reference to the database service
var database = firebase.database();

// References to HTML elements
const playerNameInput = document.getElementById('player-name');
const joinGameButton = document.getElementById('join-game');
const playerSetupDiv = document.getElementById('player-setup');
const gamePlayDiv = document.getElementById('game-play');
const playersListDiv = document.getElementById('players-list');
const questionDiv = document.getElementById('question');
const answerInput = document.getElementById('answer-input');
const submitAnswerButton = document.getElementById('submit-answer');
const answersListDiv = document.getElementById('answers-list');

//Handling player joining

let playerName = '';

joinGameButton.addEventListener('click', () => {
  playerName = playerNameInput.value.trim();
  if (playerName) {
    addPlayer(playerName);
    playerSetupDiv.style.display = 'none';
    gamePlayDiv.style.display = 'block';
    loadQuestion();
  } else {
    alert('Please enter your name.');
  }
});

//Adding player to firebase

function addPlayer(name) {
    database.ref('players/' + name).set({
      name: name
    });
  }
  
  //Displaying list of players

  database.ref('players').on('value', (snapshot) => {
    const players = snapshot.val();
    playersListDiv.innerHTML = '<h3>Players:</h3>';
    for (let key in players) {
      playersListDiv.innerHTML += `<p>${players[key].name}</p>`;
    }
  });

  //Loading and displaying question

  function loadQuestion() {
    // For now, we'll use a hardcoded question
    const questionText = 'Name something you might bring on a camping trip.';
    questionDiv.innerHTML = `<h2>${questionText}</h2>`;
  }

  //Handling answer submisions

  submitAnswerButton.addEventListener('click', () => {
    const answer = answerInput.value.trim();
    if (answer) {
      submitAnswer(playerName, answer);
      answerInput.value = '';
    } else {
      alert('Please enter an answer.');
    }
  });

  //Submiting answer to Firebase

  function submitAnswer(player, answer) {
    database.ref('answers').push({
      player: player,
      answer: answer
    });
  }

  //Displaying answers in Real-Time

  database.ref('answers').on('value', (snapshot) => {
    const answers = snapshot.val();
    answersListDiv.innerHTML = '<h3>Answers:</h3>';
    for (let key in answers) {
      const { player, answer } = answers[key];
      answersListDiv.innerHTML += `<p><strong>${player}:</strong> ${answer}</p>`;
    }
  });
  