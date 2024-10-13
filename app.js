// Reference to the database service
var database = firebase.database();

// References to HTML elements
const playerNameInput = document.getElementById('player-name');
const joinGameButton = document.getElementById('join-game');
const playerSetupDiv = document.getElementById('player-setup');
const gamePlayDiv = document.getElementById('game-play');
const playersListDiv = document.getElementById('players-list');
const hostControlsDiv = document.getElementById('host-controls');
const questionFileInput = document.getElementById('question-file-input');
const loadQuestionsButton = document.getElementById('load-questions');
const questionDiv = document.getElementById('question');
const answerInput = document.getElementById('answer-input');
const submitAnswerButton = document.getElementById('submit-answer');
const answersListDiv = document.getElementById('answers-list');
const nextQuestionButton = document.getElementById('next-question');
const resetGameButton = document.getElementById('reset-game');

let playerName = '';
let isHost = false;
let currentQuestionIndex = 0;
let playerScores = {};
let questions = [];
let answersData = {};

// Handle player joining
joinGameButton.addEventListener('click', () => {
  playerName = playerNameInput.value.trim();
  if (playerName) {
    addPlayer(playerName);

    // Check if player is the host
    if (playerName.toLowerCase() === 'rakesh'.toLowerCase()) {
      isHost = true;
      hostControlsDiv.style.display = 'block';
      console.log('Host recognized:', playerName);
} else {
  console.log('Player joined:', playerName);
}
    

    playerSetupDiv.style.display = 'none';
    gamePlayDiv.style.display = 'block';
    loadQuestion();
  } else {
    alert('Please enter your name.');
  }
});

function addPlayer(name) {
  database.ref('players/' + name).set({
    name: name,
    score: 0
  });
}

// Update players list and scores
database.ref('players').on('value', (snapshot) => {
  const players = snapshot.val();
  playersListDiv.innerHTML = '<h3>Players:</h3>';
  if (players) {
    for (let key in players) {
      const player = players[key];
      playersListDiv.innerHTML += `
        <div class="player-item">
          <span class="player-name">${player.name}</span>
          <span class="player-score">${player.score} pts</span>
        </div>
      `;
    }
  }
});

// Load questions from the database
database.ref('questions').on('value', (snapshot) => {
  const data = snapshot.val();
  if (data) {
    questions = data.questions;
    answersData = data.answersData;
    loadQuestion();
  }
});

// Load and display the current question
function loadQuestion() {
  if (questions.length > 0) {
    const questionText = questions[currentQuestionIndex];
    questionDiv.innerHTML = `<h2>${questionText}</h2>`;
  } else {
    questionDiv.innerHTML = `<h2>No questions available.</h2>`;
  }
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

  // Update player's score in the database
  database.ref('players/' + player).once('value').then((snapshot) => {
    let currentScore = snapshot.val().score || 0;
    currentScore += points;
    database.ref('players/' + player).update({ score: currentScore });
  });

  // Save the answer along with points
  database.ref('answers').push({
    player: player,
    answer: answer,
    points: points
  });
}

// Display answers in real-time
database.ref('answers').on('value', (snapshot) => {
  const answers = snapshot.val();
  answersListDiv.innerHTML = '<h3>Answers:</h3>';
  if (answers) {
    for (let key in answers) {
      const { player, answer, points } = answers[key];
      answersListDiv.innerHTML += `<p><strong>${player}:</strong> ${answer} (${points} pts)</p>`;
    }
  }
});

// Host: Load questions from uploaded file
loadQuestionsButton.addEventListener('click', () => {
  const file = questionFileInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      parseQuestionsFile(e.target.result);
    };
    reader.readAsText(file);
  } else {
    alert('Please select a file.');
  }
});

// Parse the uploaded questions file
function parseQuestionsFile(fileContent) {
  questions = [];
  answersData = {};
  const lines = fileContent.split('\n');
  let currentQuestion = '';
  let currentAnswers = {};
  lines.forEach((line) => {
    line = line.trim();
    if (line === '') {
      // Empty line indicates end of answers for a question
      if (currentQuestion) {
        questions.push(currentQuestion);
        answersData[currentQuestion] = currentAnswers;
        currentQuestion = '';
        currentAnswers = {};
      }
    } else if (!currentQuestion) {
      // The line is a question
      currentQuestion = line;
    } else {
      // The line is an answer with popularity
      const match = line.match(/^(.+)\((\d+)\)$/);
      if (match) {
        const answerText = match[1].trim().toLowerCase();
        const popularity = parseInt(match[2]);
        currentAnswers[answerText] = popularity;
      }
    }
  });
  // Save the last question and answers if file doesn't end with an empty line
  if (currentQuestion) {
    questions.push(currentQuestion);
    answersData[currentQuestion] = currentAnswers;
  }
  // Save questions and answers to the database
  database.ref('questions').set({
    questions: questions,
    answersData: answersData
  });
  alert('Questions loaded successfully!');
}

// Host: Proceed to next question
nextQuestionButton.addEventListener('click', () => {
  currentQuestionIndex = (currentQuestionIndex + 1) % questions.length;
  loadQuestion();
  // Clear previous answers
  database.ref('answers').remove();
});

// Host: Reset the game
resetGameButton.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset the game?')) {
    database.ref().set(null);
    location.reload();
  }
});

