#!/usr/bin/env node
// scripts/seed-vocabulary.mjs
// Generates ~300 A1-B1 English vocabulary entries via NVIDIA API,
// outputs SQL INSERT to stdout for piping to Supabase execute_sql.
// Run: node scripts/seed-vocabulary.mjs > /tmp/seed.sql

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
if (!NVIDIA_API_KEY) {
  console.error('缺少環境變數 NVIDIA_API_KEY，請先 export NVIDIA_API_KEY=... 再執行');
  process.exit(1);
}
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';

const WORDS = {
  A1: [
    'apple','baby','bag','ball','bed','big','bird','blue','body','book',
    'boy','bread','brother','bus','buy','cake','call','car','cat','chair',
    'city','class','clean','close','coffee','cold','color','come','cook','cup',
    'dance','dark','day','desk','dog','door','drink','ear','eat','egg',
    'eye','face','family','fast','father','fish','flower','fly','food','friend',
    'fruit','game','garden','girl','give','go','good','green','hand','happy',
    'hat','head','help','home','house','ice','job','keep','key','know',
    'large','learn','like','listen','little','long','look','love','make','man',
    'milk','money','moon','mother','music','name','need','open','park','people',
    'phone','play','red','room','run','school','see','small','sun','talk',
  ],
  A2: [
    'ability','abroad','accept','accident','address','afraid','agree','airport','angry','animal',
    'arrive','art','autumn','beach','beautiful','believe','bicycle','birthday','bridge','bright',
    'build','button','calm','camp','carry','catch','chance','change','cheap','check',
    'choose','clever','clothes','cloud','collect','college','corner','cost','country','create',
    'crowd','culture','danger','decide','deliver','describe','difficult','direction','discover','early',
    'earth','east','enjoy','exam','exercise','expensive','explain','famous','feel','film',
    'find','finish','forget','free','fresh','full','future','gift','goal','guess',
    'guide','happen','hard','health','hear','heavy','holiday','hospital','hotel','hour',
    'important','interest','island','join','kind','laugh','lazy','leader','lesson','market',
    'meal','meeting','message','mistake','modern','mountain','movie','nature','north','south',
  ],
  B1: [
    'achieve','advantage','afford','argue','atmosphere','attitude','authority','benefit','budget','career',
    'challenge','characteristic','comfortable','communicate','community','compare','compete','concentrate','confidence','consequence',
    'consider','contribute','convenience','convince','courage','debate','develop','discuss','economy','education',
    'effective','effort','emergency','emotion','employ','encourage','energy','environment','essential','evidence',
    'examine','experience','experiment','expert','facility','failure','feature','flexible','focus','generate',
    'genuine','government','growth','highlight','identify','illustrate','imagine','impact','improve','influence',
    'investigate','involve','judge','knowledge','leadership','manage','measure','method','motivate','negotiate',
    'observe','obtain','opinion','organize','participate','performance','perspective','policy','potential','predict',
    'prevent','process','progress','promote','provide','purpose','realize','recognize','recommend','reduce',
    'reflect','relationship','relevant','research','responsibility','strategy','success','support','technology','tradition',
  ],
};

const LEVEL_DIFFICULTY = { A1: 1, A2: 2, B1: 3 };

function escape(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

async function generateVocabBatch(words, level) {
  const prompt = `You are a vocabulary dictionary. For each English word in the list below, return a JSON array where each element has exactly these fields:
- "word": the exact word (lowercase)
- "phonetic": IPA phonetic transcription with slashes, e.g. /ˈæpəl/
- "part_of_speech": one of: noun, verb, adjective, adverb, preposition, conjunction, exclamation
- "definition_zh": concise Traditional Chinese definition, max 15 characters
- "example_sentence": a natural English sentence using the word
- "example_sentence_zh": Traditional Chinese translation of the example sentence

Words to process: ${words.join(', ')}

Return ONLY a valid JSON array. No markdown. No explanation. Just the JSON array.`;

  const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`NVIDIA API ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`No JSON array in: ${content.slice(0, 300)}`);
  return JSON.parse(jsonMatch[0]);
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const rows = [];

  for (const [level, words] of Object.entries(WORDS)) {
    const difficulty = LEVEL_DIFFICULTY[level];
    const batches = chunkArray(words, 25);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      process.stderr.write(`[${level}] batch ${i+1}/${batches.length} (${batch.length} words)...\n`);

      let vocabData;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          vocabData = await generateVocabBatch(batch, level);
          break;
        } catch (e) {
          process.stderr.write(`  attempt ${attempt} failed: ${e.message}\n`);
          if (attempt < 3) await sleep(3000);
          else { process.stderr.write('  Skipping batch.\n'); vocabData = []; }
        }
      }

      for (const item of vocabData) {
        if (!item.word) continue;
        rows.push({
          word: escape(item.word.toLowerCase().trim()),
          level,
          phonetic: escape(item.phonetic || ''),
          part_of_speech: escape(item.part_of_speech || 'noun'),
          definition_zh: escape(item.definition_zh || ''),
          example_sentence: escape(item.example_sentence || ''),
          example_sentence_zh: escape(item.example_sentence_zh || ''),
          difficulty,
        });
      }

      if (i < batches.length - 1) await sleep(1500);
    }
  }

  // Output SQL
  if (rows.length === 0) {
    process.stderr.write('No rows generated!\n');
    process.exit(1);
  }

  process.stdout.write('INSERT INTO vocabulary (word, level, phonetic, part_of_speech, definition_zh, example_en, example_sentence, example_sentence_zh, difficulty) VALUES\n');
  rows.forEach((r, idx) => {
    const comma = idx < rows.length - 1 ? ',' : '';
    process.stdout.write(
      `  ('${r.word}','${r.level}','${r.phonetic}','${r.part_of_speech}','${r.definition_zh}','${r.example_sentence}','${r.example_sentence}','${r.example_sentence_zh}',${r.difficulty})${comma}\n`
    );
  });
  process.stdout.write('ON CONFLICT DO NOTHING;\n');

  process.stderr.write(`\nDone: ${rows.length} rows generated.\n`);
}

main().catch(e => { process.stderr.write(e.message + '\n'); process.exit(1); });
