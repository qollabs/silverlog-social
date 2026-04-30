/**
 * Seed development data — usage:
 *   pnpm seed
 *
 * Loads .env.local automatically via tsx. Wipes and recreates Users + Events.
 * Safe: refuses to run if NODE_ENV === 'production'.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { Event } from '../src/models/Event';

const SAMPLE_USERS = [
  {
    name: '김영자',
    phone: '01011112222',
    interests: [
      { category: 'physical', label: '요가' },
      { category: 'physical', label: '산책' },
      { category: 'religion', label: '기독교' },
    ],
    preferredTimeSlots: ['morning'],
    onboardedAt: new Date(),
  },
  {
    name: '박철수',
    phone: '01022223333',
    interests: [
      { category: 'hobby', label: '바둑' },
      { category: 'hobby', label: '서예' },
    ],
    preferredTimeSlots: ['afternoon'],
    onboardedAt: new Date(),
  },
  {
    name: '이순자',
    phone: '01033334444',
    interests: [
      { category: 'physical', label: '요가' },
      { category: 'food', label: '한식' },
      { category: 'social', label: '소규모 모임' },
    ],
    preferredTimeSlots: ['morning', 'afternoon'],
    onboardedAt: new Date(),
  },
  {
    name: '최명호',
    phone: '01044445555',
    interests: [
      { category: 'physical', label: '게이트볼' },
      { category: 'hobby', label: '바둑' },
    ],
    preferredTimeSlots: ['afternoon'],
    onboardedAt: new Date(),
  },
] as const;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run seed in production.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI not set.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  await User.deleteMany({});
  await Event.deleteMany({});
  console.log('Wiped.');

  const users = await User.insertMany(SAMPLE_USERS);
  console.log(`Created ${users.length} users.`);

  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const events = await Event.insertMany([
    {
      title: '월요일 아침 요가 모임',
      description: '가벼운 스트레칭과 호흡 위주의 요가입니다. 초보자도 환영합니다.',
      location: '1층 다목적 홀',
      startAt: setKstHour(tomorrow, 9),
      endAt: setKstHour(tomorrow, 10),
      maxAttendees: 12,
      attendees: [users[0]._id, users[2]._id],
      tags: ['요가', '초보환영', '실내'],
      category: 'physical',
      createdBy: users[0]._id,
    },
    {
      title: '바둑 정기 모임',
      description: '실력 무관, 친목 위주의 모임입니다.',
      location: '커뮤니티실 B',
      startAt: setKstHour(nextWeek, 14),
      endAt: setKstHour(nextWeek, 17),
      maxAttendees: 8,
      attendees: [users[1]._id, users[3]._id],
      tags: ['바둑', '정기모임'],
      category: 'hobby',
      createdBy: users[1]._id,
    },
    {
      title: '한식 반찬 만들기',
      description: '계절 반찬을 함께 만들어 봅니다. 견과 알레르기 있으신 분 미리 알려주세요.',
      location: '쿠킹 스튜디오',
      startAt: setKstHour(nextWeek, 10),
      endAt: setKstHour(nextWeek, 12),
      maxAttendees: 6,
      attendees: [users[2]._id, users[2]._id, users[2]._id, users[2]._id, users[2]._id, users[2]._id], // intentionally full
      tags: ['요리', '한식', '소규모'],
      category: 'food',
      createdBy: users[2]._id,
    },
    {
      title: '오후 단지 산책',
      description: '단지 내 정원을 천천히 걷습니다.',
      location: '정문 앞 광장',
      startAt: setKstHour(lastWeek, 15),
      endAt: setKstHour(lastWeek, 16),
      maxAttendees: 20,
      attendees: [users[0]._id, users[2]._id],
      tags: ['산책', '실외'],
      category: 'physical',
      createdBy: users[0]._id,
    },
  ]);
  console.log(`Created ${events.length} events.`);

  await mongoose.disconnect();
  console.log('Done.');
}

function setKstHour(d: Date, hour: number): Date {
  // Set a date at the given KST hour
  const out = new Date(d);
  out.setUTCHours(hour - 9, 0, 0, 0);
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
