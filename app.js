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
const revealedAnswersDiv = document.getElementById('revealed-answers');
const nextQuestionButton = document.getElementById('next-question');
const resetGameButton = document.getElementById('reset-game');
const revealAnswersButton = document.getElementById('reveal-answers');

let playerName = '';
let isHost = false;
let playerScores = {};
let questions = [];
let answersData = {};
let currentQuestion = '';
let revealedAnswers = false;

// Handle player joining
joinGameButton.addEventListener('click', () => {
  playerName = playerNameInput.value.trim();
  if (playerName) {
    addPlayer(playerName);

    // Check if player is the host
    if (playerName.trim().toLowerCase() === 'your-host-name'.toLowerCase()) {
      isHost = true;
      hostControlsDiv.style.display = 'block';
    }

    playerSetupDiv.style.display = 'none';
    gamePlayDiv.style.display = 'block';
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
  }
});

// Listen for changes to the current question index
database.ref('currentQuestionIndex').on('value', (snapshot) => {
  const index = snapshot.val();
  if (index !== null && questions.length > 0) {
    currentQuestion = questions[index];
    loadQuestion();
  }
});

// Listen for reveal answers event
database.ref('revealedAnswers').on('value', (snapshot) => {
  revealedAnswers = snapshot.val();
  if (revealedAnswers && currentQuestion) {
    displayRevealedAnswers();
  } else {
    revealedAnswersDiv.style.display = 'none';
  }
});

// Load and display the current question
function loadQuestion() {
  if (currentQuestion) {
    questionDiv.innerHTML = `<h2>${currentQuestion}</h2>`;
    // Clear previous answers
    answersListDiv.innerHTML = '<h3>Answers:</h3>';
    revealedAnswersDiv.style.display = 'none';
    revealedAnswers = false;
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
  let currentQuestionText = '';
  let currentAnswers = {};
  lines.forEach((line) => {
    line = line.trim();
    if (line === '') {
      // Empty line indicates end of answers for a question
      if (currentQuestionText) {
        questions.push(currentQuestionText);
        answersData[currentQuestionText] = currentAnswers;
        currentQuestionText = '';
        currentAnswers = {};
      }
    } else if (/^\d+\.\s+/.test(line)) {
      // Line starts with a number and a dot (e.g., "111. ")
      if (currentQuestionText) {
        // Save previous question and answers before starting a new one
        questions.push(currentQuestionText);
        answersData[currentQuestionText] = currentAnswers;
        currentAnswers = {};
      }
      // Extract the question text
      currentQuestionText = line.replace(/^\d+\.\s+/, '').trim();
    } else {
      // Line is an answer with points in the format "Answer (X points)"
      const match = line.match(/^(.+)\((\d+)\s*points?\)$/i);
      if (match) {
        const answerText = match[1].trim().toLowerCase();
        const popularity = parseInt(match[2]);
        currentAnswers[answerText] = popularity;
      }
    }
  });
  // Save the last question and answers if file doesn't end with an empty line
  if (currentQuestionText) {
    questions.push(currentQuestionText);
    answersData[currentQuestionText] = currentAnswers;
  }
  // Randomize question order
  shuffleArray(questions);

  // Save questions and answers to the database
  database.ref('questions').set({
    questions: questions,
    answersData: answersData
  }).then(() => {
    // Reset current question index to -1 to start from the first question when "Next Question" is clicked
    database.ref('currentQuestionIndex').set(-1);
    alert('Questions loaded successfully!');
  });
}

// Shuffle array function
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Host: Proceed to next question
nextQuestionButton.addEventListener('click', () => {
  database.ref('currentQuestionIndex').once('value').then((snapshot) => {
    let index = snapshot.val();
    index = (index + 1) % questions.length;
    database.ref('currentQuestionIndex').set(index);
    // Clear previous answers
    database.ref('answers').remove();
    // Hide revealed answers
    database.ref('revealedAnswers').set(false);
  });
});

// Host: Reveal answers
revealAnswersButton.addEventListener('click', () => {
  database.ref('revealedAnswers').set(true);
});

// Display revealed answers
function displayRevealedAnswers() {
  revealedAnswersDiv.style.display = 'block';
  revealedAnswersDiv.innerHTML = '<h3>Correct Answers:</h3>';
  const correctAnswers = answersData[currentQuestion];
  for (let answer in correctAnswers) {
    const points = correctAnswers[answer];
    revealedAnswersDiv.innerHTML += `<p>${answer} (${points} pts)</p>`;
  }
}

// Host: Reset the game
resetGameButton.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset the game?')) {
    database.ref().set(null).then(() => {
      location.reload();
    });
  }
});
