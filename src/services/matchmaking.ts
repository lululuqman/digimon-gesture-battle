import { supabase } from '../lib/supabase';

/**
 * REQUIRED SUPABASE SCHEMA:
 * 
 * Table: rooms
 * - id: uuid (primary key, default: uuid_generate_v4())
 * - pin: text (not null) -- NEW: 6-digit code for joining
 * - player1_id: text
 * - player2_id: text (nullable)
 * - status: text (default: 'waiting')
 * - created_at: timestamptz (default: now())
 * 
 * Enable Realtime for 'rooms' table in Supabase Dashboard.
 */

export interface GameRoom {
  id: string;
  pin: string;
  player1_id: string;
  player2_id: string | null;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
}

const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

export const MatchmakingService = {
  /**
   * Creates a new room with a PIN and acts as Host.
   */
  async createHostRoom(playerId: string): Promise<GameRoom> {
    const pin = generatePin();
    
    const { data: newRoom, error: createError } = await supabase
      .from('rooms')
      .insert([
        { 
          player1_id: playerId, 
          status: 'waiting',
          pin: pin
        }
      ])
      .select()
      .single();

    if (createError) {
      console.error('Error creating room:', createError);
      throw createError;
    }

    return newRoom;
  },

  /**
   * Attempts to join a room using a PIN.
   */
  async joinRoom(playerId: string, pin: string): Promise<GameRoom> {
    // 1. Find the room with the PIN
    const { data: rooms, error: searchError } = await supabase
      .from('rooms')
      .select('*')
      .eq('pin', pin)
      .eq('status', 'waiting')
      .limit(1);

    if (searchError) throw searchError;
    if (!rooms || rooms.length === 0) {
      throw new Error("Room not found or full");
    }

    const room = rooms[0];

    // 2. Join it
    const { data: joinedRoom, error: joinError } = await supabase
      .from('rooms')
      .update({ 
        player2_id: playerId, 
        status: 'active' 
      })
      .eq('id', room.id)
      .eq('status', 'waiting')
      .select()
      .single();

    if (joinError) throw joinError;
    
    return joinedRoom;
  },

  /**
   * Cancels a search by deleting the room if it's still waiting.
   */
  async cancelMatchSearch(roomId: string) {
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('status', 'waiting');

    if (error) {
      console.error('Error cancelling match:', error);
    }
  },
  
  /**
   * Subscribe to room updates (for the host waiting for a player).
   */
  subscribeToRoom(roomId: string, onUpdate: (room: GameRoom) => void) {
    return supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          onUpdate(payload.new as GameRoom);
        }
      )
      .subscribe();
  }
};
