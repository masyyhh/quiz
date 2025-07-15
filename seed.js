const fs = require('fs');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'qz5tjx',
  database: 'quiz'
};

async function seedDatabase() {
  const connection = await mysql.createConnection(dbConfig);
  console.log('Connected to DB');

  // Create tables if they don't exist
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question_text TEXT NOT NULL,
      explanation TEXT NOT NULL
    )
  `);

  await connection.execute(`
    CREATE TABLE IF NOT EXISTS options (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question_id INT NOT NULL,
      option_text VARCHAR(255) NOT NULL,
      is_correct BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )
  `);

  // Load questions from JSON file
  const raw = fs.readFileSync('questions.json', 'utf-8');
  const questions = JSON.parse(raw);

  for (const q of questions) {
    const [result] = await connection.execute(
      `INSERT INTO questions (question_text, explanation) VALUES (?, ?)`,
      [q.question_text, q.explanation]
    );

    const questionId = result.insertId;

    for (const opt of q.options) {
      await connection.execute(
        `INSERT INTO options (question_id, option_text, is_correct) VALUES (?, ?, ?)`,
        [questionId, opt.text, opt.is_correct]
      );
    }
  }

  console.log(`Seeded ${questions.length} questions with options.`);
  await connection.end();
}

seedDatabase().catch(err => console.error('Seeding failed:', err));
