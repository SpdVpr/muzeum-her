/**
 * Firestore Seed Script
 * Naplní Firestore databázi testovacími daty
 * 
 * Použití:
 * 1. Nastav Firebase credentials v .env.local
 * 2. Spusť: npm run seed
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import seedData from '../firebase-seed-data.json';

// Firebase config z environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedCodeRanges() {
  console.log('🌱 Seeding code_ranges collection...');
  
  const codeRanges = seedData.code_ranges;
  let count = 0;

  for (const [id, range] of Object.entries(codeRanges)) {
    const docRef = doc(db, 'code_ranges', id);
    
    await setDoc(docRef, {
      ...range,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    count++;
    console.log(`  ✓ ${range.name}`);
  }

  console.log(`✅ Imported ${count} code ranges\n`);
}

async function seedTerminals() {
  console.log('🌱 Seeding terminals collection...');

  const terminals = [
    {
      id: 'entry-cyber',
      type: 'ENTRY',
      location: 'Cyber Arcade - Hlavní vchod',
      locationCode: '03',
      relayEnabled: true,
      active: true
    },
    {
      id: 'entry-gameworld',
      type: 'ENTRY',
      location: 'Game World - Hlavní vchod',
      locationCode: '02',
      relayEnabled: true,
      active: true
    },
    {
      id: 'entry-gamestation',
      type: 'ENTRY',
      location: 'Game Station - Hlavní vchod',
      locationCode: '01',
      relayEnabled: true,
      active: true
    },
    {
      id: 'check-cyber',
      type: 'CHECK',
      location: 'Cyber Arcade - Prostřední hala',
      locationCode: '03',
      relayEnabled: false,
      active: true
    },
    {
      id: 'check-gameworld',
      type: 'CHECK',
      location: 'Game World - Prostřední hala',
      locationCode: '02',
      relayEnabled: false,
      active: true
    },
    {
      id: 'exit-cyber',
      type: 'EXIT',
      location: 'Cyber Arcade - Východ',
      locationCode: '03',
      relayEnabled: true,
      active: true
    },
    {
      id: 'exit-gameworld',
      type: 'EXIT',
      location: 'Game World - Východ',
      locationCode: '02',
      relayEnabled: true,
      active: true
    },
    {
      id: 'exit-gamestation',
      type: 'EXIT',
      location: 'Game Station - Východ',
      locationCode: '01',
      relayEnabled: true,
      active: true
    }
  ];

  for (const terminal of terminals) {
    const { id, ...data } = terminal;
    const docRef = doc(db, 'terminals', id);
    
    await setDoc(docRef, {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    console.log(`  ✓ ${terminal.location}`);
  }

  console.log(`✅ Imported ${terminals.length} terminals\n`);
}

async function main() {
  console.log('🚀 Starting Firestore seed...\n');
  
  try {
    await seedCodeRanges();
    await seedTerminals();
    
    console.log('🎉 Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    process.exit(1);
  }
}

main();

