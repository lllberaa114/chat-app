"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Plus } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

type Message = Database['public']['Tables']['messages']['Row'] & {
  user: Database['public']['Tables']['users']['Row'];
};

type ChatGroup = Database['public']['Tables']['chat_groups']['Row'] & {
  latest_message?: Message;
};

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserAndGroups = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        window.location.href = '/';
        return;
      }
      setUser(currentUser);

      const { data: groups, error: groupsError } = await supabase
        .from('chat_groups')
        .select(`
          *,
          group_memberships!inner(user_id)
        `)
        .eq('group_memberships.user_id', currentUser.id);

      if (groupsError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load chat groups",
        });
        return;
      }

      setGroups(groups || []);
      setLoading(false);
    };

    fetchUserAndGroups();

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        const { data: newMessage, error } = await supabase
          .from('messages')
          .select('*, user:users(*)')
          .eq('message_id', payload.new.message_id)
          .single();

        if (!error && newMessage) {
          setMessages(prev => [...prev, newMessage as Message]);
        }
      })
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, []);

  const loadMessages = async (groupId: string) => {
    setSelectedGroup(groupId);
    const { data, error } = await supabase
      .from('messages')
      .select('*, user:users(*)')
      .eq('group_id', groupId)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load messages",
      });
      return;
    }

    setMessages(data?.reverse() || []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        group_id: selectedGroup,
        sender_id: user.id,
        content: newMessage.trim(),
        message_type: 'text'
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message",
      });
      return;
    }

    setNewMessage('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r">
        <div className="p-4 border-b">
          <Button className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-73px)]">
          {groups.map((group) => (
            <button
              key={group.group_id}
              onClick={() => loadMessages(group.group_id)}
              className={`w-full p-4 text-left hover:bg-gray-50 ${
                selectedGroup === group.group_id ? 'bg-gray-100' : ''
              }`}
            >
              <h3 className="font-medium truncate">{group.name}</h3>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedGroup ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.message_id}
                  className={`flex ${
                    message.sender_id === user.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.sender_id === user.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">
                      {message.user.display_name}
                    </p>
                    <p>{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t bg-white">
              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}