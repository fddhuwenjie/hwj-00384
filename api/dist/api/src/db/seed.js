import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedFilePath = path.join(__dirname, '../../data/seedQuestions.json');
const getQuestionCount = () => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM questions');
    const result = stmt.get();
    return result.count;
};
const readSeedQuestions = () => {
    const rawData = fs.readFileSync(seedFilePath, 'utf-8');
    return JSON.parse(rawData);
};
const insertQuestion = (question) => {
    const stmt = db.prepare(`
    INSERT INTO questions (
      text, option_a, option_b, option_c, option_d,
      correct_answer, difficulty, category, analysis
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(question.text, question.options[0], question.options[1], question.options[2], question.options[3], question.correctAnswer, question.difficulty, question.category, question.analysis);
};
const seedQuestions = async () => {
    const currentCount = getQuestionCount();
    const seedData = readSeedQuestions();
    if (currentCount >= 100) {
        return { inserted: 0, total: currentCount };
    }
    const insert = db.transaction((questions) => {
        for (const q of questions) {
            insertQuestion(q);
        }
        return questions.length;
    });
    const inserted = insert(seedData);
    const total = getQuestionCount();
    return { inserted, total };
};
export { seedQuestions, getQuestionCount, readSeedQuestions };
export default seedQuestions;
