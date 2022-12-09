import { collection, onSnapshot } from 'firebase/firestore';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import db from '../../../lib/firebase';
import { GameService } from '../../../lib/services/Game';
import { RoomService } from '../../../lib/services/Room';

const fetcher = async (key: string, inviteCode: string) => {
  return RoomService.getRoomByInviteCode(inviteCode);
};

function Room() {
  const router = useRouter();
  const { inviteCode } = router.query;
  const { data: room, error } = useSWR(
    ['roomByInviteCode', inviteCode],
    fetcher
  );
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    let unsubscribe = () => {};
    if (room?.id) {
      const colRef = collection(db, `rooms/${room.id}/players`);
      //real time update
      unsubscribe = onSnapshot(colRef, (snapshot) => {
        const arr: any[] = [];
        snapshot.docs.forEach((doc) => {
          // console.log("onsnapshot", doc.data());
          arr.push({ id: doc.id, ...doc.data() });
        });
        setPlayers(arr);
      });
    }
    return () => unsubscribe();
  }, [room?.id]);

  console.log(players);

  const startGame = async (e) => {
    try {
      const game = await GameService.createGame(room.id, 'palace');
      router.push(`/rooms/${inviteCode}/games/${game.id}`);
    } catch (err) {
      console.log('ERROR CREATING GAME', err);
    }
  };

  const renderPlayer = (player, i) => {
    return (
      <div
        key={i}
        className="bg-blue-500 appearance-none truncate border-2 m-2 border-gray-200 rounded-full w-44 py-2 px-2 text-xl text-white text-center leading-tight focus:outline-none"
      >
        {player.name}
      </div>
    );
  };

  if (!room) {
    return <div>loading...</div>;
  }

  return (
    <div className="flex justify-center items-center">
      <Head>
        <title>{room?.name || 'Multiland'}</title>
        <meta name="description" content="Multiland!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex flex-1 flex-col justify-center items-center max-w-3xl min-h-screen">
        <h1 className="text-5xl">Welcome to {room?.name || ''}</h1>
        <div className="flex mt-8 w-3/4 flex-wrap">
          {players.map(renderPlayer)}
        </div>
        <button
          className="shadow bg-purple-500 hover:bg-purple-400 focus:shadow-outline focus:outline-none text-white font-bold py-8 px-8 text-xl rounded-full mt-8"
          type="button"
          onClick={startGame}
        >
          Start game
        </button>
      </main>
    </div>
  );
}

export default Room;
