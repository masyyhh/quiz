const fs = require('fs');
const pdf = require('pdf-parse');

const filePath = './Multiple choice questions.pdf';

const parseQuestions = (text) => {
  const questionRegex = /\d+\.(.*?)\nA\.\s*(.*?)\nB\.\s*(.*?)\nC\.\s*(.*?)\nD\.\s*(.*?)\n\s*Explanation:\s*(.*?)(?=\n\d+\.|\n?$)/gs;
  const matches = text.matchAll(questionRegex);

  const questions = [];

  for (const match of matches) {
    const [, qText, a, b, c, d, explanation] = match.map(s => s.trim());

    // Score each option by how often it appears in the explanation
    const options = [a, b, c, d];
    const score = options.map(opt =>
      (explanation.toLowerCase().includes(opt.toLowerCase()) ? 1 : 0)
    );
    const correctIndex = score.indexOf(1) !== -1 ? score.indexOf(1) : 0;

    questions.push({
      question_text: qText,
      explanation,
      options: options.map((opt, i) => ({
        text: opt,
        is_correct: i === correctIndex,
      })),
    });
  }

  return questions;
};

(async () => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);

    const questions = parseQuestions(data.text);
    fs.writeFileSync('questions.json', JSON.stringify(questions, null, 2));
    console.log(`✅ Extracted ${questions.length} questions to questions.json`);
  } catch (err) {
    console.error('❌ Failed to extract PDF:', err);
  }
})();
