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
const revealAnswersButton = document.getElementById('reveal-answers');
const revealedAnswersDiv = document.getElementById('revealed-answers');

let playerName = '';
let isHost = false;
let questions = [];
let answersData = {};
let currentQuestion = '';
let currentQuestionID = '';
let revealedAnswers = false;
let questionsLoaded = false;

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

    // Load questions and set up listeners
    setupGameListeners();
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

function setupGameListeners() {
  console.log(`${playerName} is setting up game listeners`);

  // Listen for changes to the 'questions' node
  database.ref('questions').on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      questions = data.questions;
      answersData = data.answersData;
      questionsLoaded = true;
      console.log(`${playerName} loaded questions`);
      // Load the current question if currentQuestionIndex is set
      database.ref('currentQuestionIndex').once('value').then((snapshot) => {
        const index = snapshot.val();
        if (index !== null && index >= 0 && questions.length > 0) {
          currentQuestionID = questions[index].id;
          currentQuestion = questions[index].text;
          loadQuestion();
        }
      });
    } else {
      console.log(`${playerName}: No questions found in database`);
      questionDiv.innerHTML = `<h2>No questions available.</h2>`;
    }
  }, (error) => {
    console.error(`${playerName}: Error loading questions:`, error);
  });

  // Listen for changes to currentQuestionIndex
  database.ref('currentQuestionIndex').on('value', (snapshot) => {
    const index = snapshot.val();
    console.log(`${playerName} received currentQuestionIndex: ${index}`);
    if (index !== null && index >= 0 && questionsLoaded && questions.length > 0) {
      currentQuestionID = questions[index].id;
      currentQuestion = questions[index].text;
      loadQuestion();
    } else {
      questionDiv.innerHTML = `<h2>Waiting for the next question...</h2>`;
    }
  });

  // Listen for reveal answers event
  database.ref('revealedAnswers').on('value', (snapshot) => {
    revealedAnswers = snapshot.val();
    console.log(`${playerName} received revealedAnswers: ${revealedAnswers}`);
    if (revealedAnswers && currentQuestionID) {
      displayRevealedAnswers();
    } else {
      revealedAnswersDiv.style.display = 'none';
    }
  });

  // Display answers in real-time
  database.ref('answers').on('value', (snapshot) => {
    console.log(`${playerName} received answers update`);
    const answers = snapshot.val();
    answersListDiv.innerHTML = '<h3>Answers:</h3>';
    if (answers) {
      for (let key in answers) {
        const { player, answer, points } = answers[key];
        answersListDiv.innerHTML += `<p><strong>${player}:</strong> ${answer} (${points} pts)</p>`;
      }
    }
  });

  // Update players list and scores
  database.ref('players').on('value', (snapshot) => {
    console.log(`${playerName} received players update`);
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
}

function loadQuestion() {
  if (currentQuestion) {
    questionDiv.innerHTML = `<h2>${currentQuestion}</h2>`;
    // Clear previous answers
    answersListDiv.innerHTML = '<h3>Answers:</h3>';
    revealedAnswersDiv.style.display = 'none';
    revealedAnswers = false;
  } else {
    questionDiv.innerHTML = `<h2>Waiting for the next question...</h2>`;
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
  const correctAnswers = answersData[currentQuestionID];

  let points = 0;
  if (correctAnswers) {
    // Search for the answer in the array
    const foundAnswer = correctAnswers.find(item => item.answer.toLowerCase() === answer);
    if (foundAnswer) {
      points = foundAnswer.points;
    }
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
  let currentAnswers = [];
  let questionID = 0;

  lines.forEach((line) => {
    line = line.trim();
    if (line === '') {
      // Empty line indicates end of answers for a question
      if (currentQuestionText) {
        questions.push({ id: questionID.toString(), text: currentQuestionText });
        answersData[questionID.toString()] = currentAnswers;
        currentQuestionText = '';
        currentAnswers = [];
        questionID++;
      }
    } else if (/^\d+\.\s+/.test(line)) {
      // Line starts with a number and a dot (e.g., "1. ")
      if (currentQuestionText) {
        // Save previous question and answers before starting a new one
        questions.push({ id: questionID.toString(), text: currentQuestionText });
        answersData[questionID.toString()] = currentAnswers;
        currentAnswers = [];
        questionID++;
      }
      // Extract the question text
      currentQuestionText = line.replace(/^\d+\.\s+/, '').trim();
    } else {
      // Line is an answer with points in the format "Answer (X points)"
      const match = line.match(/^(.+)\((\d+)\s*points?\)$/i);
      if (match) {
        const answerText = match[1].trim();
        const popularity = parseInt(match[2]);
        currentAnswers.push({ answer: answerText, points: popularity });
      }
    }
  });
  // Save the last question and answers if file doesn't end with an empty line
  if (currentQuestionText) {
    questions.push({ id: questionID.toString(), text: currentQuestionText });
    answersData[questionID.toString()] = currentAnswers;
  }
  // Randomize question order
  shuffleArray(questions);

  // Log the answersData before saving
  console.log('AnswersData before saving:', answersData);

  // Save questions and answers to the database
  database.ref('questions').set({
    questions: questions,
    answersData: answersData
  }).then(() => {
    // Reset current question index to -1 to start from the first question when "Next Question" is clicked
    database.ref('currentQuestionIndex').set(-1);
    alert('Questions loaded successfully!');
  }).catch((error) => {
    console.error('Error saving questions:', error);
    alert('Failed to save questions. Please check console for errors.');
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
    if (index === null || index === undefined || index === -1) {
      index = 0;
    } else {
      index = (index + 1) % questions.length;
    }
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
  const correctAnswers = answersData[currentQuestionID];
  for (let i = 0; i < correctAnswers.length; i++) {
    const answer = correctAnswers[i].answer;
    const points = correctAnswers[i].points;
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


