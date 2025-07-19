const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'M@see2005',
  database: 'quiz'
};

async function query(sql, params) {
  const connection = await mysql.createConnection(dbConfig);
  const [results] = await connection.execute(sql, params);
  await connection.end();
  return results;
}

// Serve static files (optional CSS/JS)
app.use(express.static('public'));

// Route to display quiz
app.get('/quiz', async (req, res) => {
  const questions = await query(`SELECT * FROM questions`);
  // For each question, get options
  for (let q of questions) {
    q.options = await query(`SELECT * FROM options WHERE question_id = ?`, [q.id]);
  }
  res.render('quiz', { questions });
});

// Handle quiz submission
app.post('/submit', async (req, res) => {
  const userAnswers = req.body; 

  const response = [];

  for (const key in userAnswers) {
    if (!key.startsWith('question_')) continue;
    const questionId = key.split('_')[1];
    const selectedOptionId = userAnswers[key];

    // Get correct option(s) for question
    const correctOptions = await query(
      `SELECT id FROM options WHERE question_id = ? AND is_correct = TRUE`,
      [questionId]
    );

    const correctOptionIds = correctOptions.map(o => o.id.toString());

    // Get question explanation
    const [question] = await query(`SELECT explanation FROM questions WHERE id = ?`, [questionId]);

    const isCorrect = correctOptionIds.includes(selectedOptionId);

    response.push({
      questionId,
      selectedOptionId,
      isCorrect,
      explanation: question.explanation,
      correctOptionIds
    });
  }

  res.json(response);
});

// Admin page to add questions
app.get('/admin', (req, res) => {
  res.render('admin');
});

// Handle admin form submission
app.post('/admin', async (req, res) => {
  // Expect req.body like:
  // { question_text, explanation, options: [ 'opt1', 'opt2', ...], correct_option_index }
  const { question_text, explanation, correct_option_index } = req.body;
  let options = req.body.options;

  // Make sure options is array
  if (typeof options === 'string') options = [options];

  try {
    const result = await query(`INSERT INTO questions (question_text, explanation) VALUES (?, ?)`, [question_text, explanation]);
    const questionId = result.insertId;

    for (let i = 0; i < options.length; i++) {
      const optionText = options[i];
      const isCorrect = (i == correct_option_index);
      await query(
        `INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)`,
        [questionId, optionText, isCorrect]
      );
    }
    res.send('Question added successfully! <a href="/admin">Add another</a> or <a href="/quiz">Take quiz</a>');
  } catch (e) {
    console.error(e);
    res.status(500).send('Error saving question');
  }
});

app.post('/submit-single', async (req, res) => {
  const { questionId, selectedOptionId } = req.body;

  const correctOptions = await query(
    `SELECT id FROM options WHERE question_id = ? AND is_correct = TRUE`,
    [questionId]
  );
  const correctIds = correctOptions.map(opt => opt.id.toString());

  const [question] = await query(`SELECT explanation FROM questions WHERE id = ?`, [questionId]);

  const isCorrect = correctIds.includes(selectedOptionId);

  res.json({
    isCorrect,
    explanation: question.explanation
  });
});

app.listen(3000, () => console.log('Server started on http://localhost:3000'));
