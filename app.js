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
const scoresListDiv = document.getElementById('scores-list');
const nextQuestionButton = document.getElementById('next-question');
const resetGameButton = document.getElementById('reset-game');

let playerName = '';
let currentQuestionIndex = 0;
let playerScores = {};

// Define questions and answers
const questions = [
  'Name something you might bring on a camping trip.',
  'Name a popular pet.',
  'Name a fruit that is typically red.',
  'Name something you might see at the beach.'
];

const answersData = {
  'Name something you might bring on a camping trip.': {
    'tent': 30,
    'sleeping bag': 25,
    'flashlight': 20,
    'food': 15,
    'water': 10
  },
  'Name a popular pet.': {
    'dog': 40,
    'cat': 35,
    'fish': 15,
    'bird': 10
  },
  'Name a fruit that is typically red.': {
    'apple': 40,
    'strawberry': 30,
    'cherry': 20,
    'watermelon': 10
  },
  'Name something you might see at the beach.': {
    'sand': 35,
    'waves': 30,
    'seashells': 20,
    'sunbathers': 15
  }
};

// Handle player joining
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

function addPlayer(name) {
  database.ref('players/' + name).set({
    name: name
  });
}

database.ref('players').on('value', (snapshot) => {
  const players = snapshot.val();
  playersListDiv.innerHTML = '<h3>Players:</h3>';
  for (let key in players) {
    playersListDiv.innerHTML += `<p>${players[key].name}</p>`;
  }
});

// Load and display the current question
function loadQuestion() {
  const questionText = questions[currentQuestionIndex];
  questionDiv.innerHTML = `<h2>${questionText}</h2>`;
}

// Handle answer submission
submitAnswerButton.addEventListener('click', () => {
  const answer = answerInput.value.trim().toLowerCase();
  if (answer) {
    submitAnswer(playerName, answer);
    answerInput.value = '';
  } else {
    alert('Please enter an answer.');
  }
});

function submitAnswer(player, answer) {
  const currentQuestion = questions[currentQuestionIndex];
  const correctAnswers = answersData[currentQuestion];

  let points = 0;
  if (correctAnswers && correctAnswers[answer]) {
    points = correctAnswers[answer];
  }

  // Update player's score
  if (playerScores[player]) {
    playerScores[player] += points;
  } else {
    playerScores[player] = points;
  }

  // Save the answer along with points
  database.ref('answers').push({
    player: player,
    answer: answer,
    points: points
  });
}

// Display answers and scores in real-time
database.ref('answers').on('value', (snapshot) => {
  const answers = snapshot.val();
  answersListDiv.innerHTML = '<h3>Answers:</h3>';
  playerScores = {}; // Reset scores
  if (answers) {
    for (let key in answers) {
      const { player, answer, points } = answers[key];
      answersListDiv.innerHTML += `<p><strong>${player}:</strong> ${answer} (${points} points)</p>`;
      // Update player scores
      if (playerScores[player]) {
        playerScores[player] += points;
      } else {
        playerScores[player] = points;
      }
    }
  }
  displayScores();
});

function displayScores() {
  scoresListDiv.innerHTML = '<h3>Scores:</h3>';
  for (let player in playerScores) {
    scoresListDiv.innerHTML += `<p>${player}: ${playerScores[player]} points</p>`;
  }
}

// Proceed to next question
nextQuestionButton.addEventListener('click', () => {
  currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
  loadQuestion();
  // Clear previous answers
  database.ref('answers').remove();
});

// Reset the game
resetGameButton.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset the game?')) {
    database.ref().set(null);
    location.reload();
  }
});
