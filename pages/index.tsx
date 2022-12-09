import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import useSWR from 'swr';
import { getCollectionFetcher } from '../lib/firebase';
import { RoomService } from '../lib/services/Room';

export default function Home() {
  const router = useRouter();
  const { data: users, error } = useSWR('users', getCollectionFetcher);
  const { data: games, error: gamesError } = useSWR(
    'games',
    getCollectionFetcher
  );
  const [inviteCode, setInviteCode] = useState<string>('');
  const [name, setName] = useState<string>('');

  console.log(error);

  if (error) return <div>failed to load</div>;
  if (!users) return <div>loading...</div>;

  console.log('DATA', users, games);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await RoomService.addPlayerToRoom(inviteCode, name);
      router.push(`/rooms/${inviteCode}`);
    } catch (err) {
      console.log('ERROR', err);
    }
  };

  return (
    <div className="flex justify-center items-center">
      <Head>
        <title>Multiland</title>
        <meta name="description" content="Multiland!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-1 flex-col justify-center items-center max-w-3xl min-h-screen">
        <h1 className="text-5xl">Welcome to Multiland!</h1>
        <form
          className="w-full flex flex-col justify-center items-center space-y-6 mt-6"
          onSubmit={onSubmit}
        >
          <div className="flex flex-col space-y-4 md:items-center w-1/2">
            <input
              className="bg-gray-800 appearance-none border-2 border-gray-200 rounded-xl w-full py-5 px-4 text-xl text-white text-center leading-tight focus:outline-none"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <input
              className="bg-gray-800 appearance-none border-2 border-gray-200 rounded-xl w-full py-5 px-4 text-xl text-white text-center leading-tight focus:outline-none"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Have an invite code?"
            />
          </div>
          <button
            className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-3 px-8 text-xl rounded-lg"
            type="submit"
          >
            Join room
          </button>
        </form>
      </main>
    </div>
  );
}
