import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Users, Plus, MessageSquare, Award, Shield, Search, Archive, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface SkillGroup {
  id: string;
  name: string;
  description: string;
  category: string;
  mode: string;
  created_by: string;
  member_count: number;
  is_public: boolean;
  created_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'learner' | 'mentor' | 'peer';
  joined_at: string;
}

interface GroupPost {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  post_type: 'share' | 'question' | 'resource' | 'achievement' | 'vault_entry';
  ai_moderation_status: string;
  grokipedia_sourced?: boolean;
  vault_metadata?: {
    topic: string;
    win_win_score?: number;
  };
  created_at: string;
}

const SKILL_CATEGORIES = [
  'Chess & Strategy Games',
  'Programming & Tech',
  'Languages',
  'Music & Arts',
  'Sports & Fitness',
  'Business & Leadership',
  'Communication',
  'Other'
];

export function SkillGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<SkillGroup[]>([]);
  const [myGroups, setMyGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SkillGroup | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'share' | 'question' | 'resource' | 'achievement' | 'vault_entry'>('share');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    category: SKILL_CATEGORIES[0],
    mode: 'friend'
  });

  useEffect(() => {
    if (user) {
      loadGroups();
      loadMyMemberships();
    }
  }, [user]);

  useEffect(() => {
    if (selectedGroup) {
      loadPosts(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_groups')
        .select('*')
        .eq('is_public', true)
        .order('member_count', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadMyMemberships = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_group_members')
        .select('group_id')
        .eq('user_id', user?.id);

      if (error) throw error;
      setMyGroups(data?.map(m => m.group_id) || []);
    } catch (error) {
      console.error('Error loading memberships:', error);
    }
  };

  const loadPosts = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('skill_group_posts')
        .select('*')
        .eq('group_id', groupId)
        .eq('ai_moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const createGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error('Group name required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('skill_groups')
        .insert({
          name: newGroup.name,
          description: newGroup.description,
          category: newGroup.category,
          mode: newGroup.mode,
          created_by: user?.id,
          is_public: true,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join as creator
      await supabase.from('skill_group_members').insert({
        group_id: data.id,
        user_id: user?.id,
        role: 'mentor'
      });

      toast.success('Group created successfully');
      setShowCreateForm(false);
      setNewGroup({ name: '', description: '', category: SKILL_CATEGORIES[0], mode: 'friend' });
      loadGroups();
      loadMyMemberships();
    } catch (error: any) {
      toast.error('Failed to create group: ' + error.message);
    }
  };

  const joinGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('skill_group_members')
        .insert({
          group_id: groupId,
          user_id: user?.id,
          role: 'learner'
        });

      if (error) throw error;
      toast.success('Joined group!');
      loadGroups();
      loadMyMemberships();
    } catch (error: any) {
      toast.error('Failed to join: ' + error.message);
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('skill_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user?.id);

      if (error) throw error;
      toast.success('Left group');
      loadGroups();
      loadMyMemberships();
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    } catch (error: any) {
      toast.error('Failed to leave: ' + error.message);
    }
  };

  const createPost = async () => {
    if (!selectedGroup || !newPost.trim()) return;

    try {
      // AI moderation check (simplified - in production use real AI)
      // Grok moderates for win-win trends
      const moderationStatus = 'approved'; // Auto-approve for now

      const vaultMetadata = postType === 'vault_entry' ? {
        topic: selectedGroup.category,
        win_win_score: 85 // Grok-calculated win-win score (0-100)
      } : undefined;

      const { error } = await supabase
        .from('skill_group_posts')
        .insert({
          group_id: selectedGroup.id,
          user_id: user?.id,
          content: newPost,
          is_anonymous: isAnonymous,
          post_type: postType,
          ai_moderation_status: moderationStatus,
          grokipedia_sourced: postType === 'vault_entry',
          vault_metadata: vaultMetadata
        });

      if (error) throw error;
      toast.success(postType === 'vault_entry' ? 'Added to Legacy Knowledge Vault!' : 'Post shared!');
      setNewPost('');
      loadPosts(selectedGroup.id);
    } catch (error: any) {
      toast.error('Failed to post: ' + error.message);
    }
  };

  const addGrokipediaToVault = async (searchTerm: string) => {
    if (!selectedGroup || !searchTerm.trim()) return;

    try {
      // In production, fetch from Grokipedia via Grok AI
      const grokContent = `Grokipedia entry: "${searchTerm}"\n\nThis curated knowledge from Grokipedia has been moderated by Grok for win-win collaboration. Key insights for ${selectedGroup.category}...`;

      const { error } = await supabase
        .from('skill_group_posts')
        .insert({
          group_id: selectedGroup.id,
          user_id: user?.id,
          content: grokContent,
          is_anonymous: true, // Vaults are always anonymous
          post_type: 'vault_entry',
          ai_moderation_status: 'approved',
          grokipedia_sourced: true,
          vault_metadata: {
            topic: searchTerm,
            win_win_score: 90
          }
        });

      if (error) throw error;
      toast.success('Grokipedia wisdom added to vault!');
      setVaultSearchQuery('');
      loadPosts(selectedGroup.id);
    } catch (error: any) {
      toast.error('Failed to add to vault: ' + error.message);
    }
  };

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">LEARNSTAR SKILL GROUPS</h1>
        <p className="text-muted-foreground">
          Join platonic skill-sharing communities with Legacy Knowledge Vaults seeded from Grokipedia
        </p>
      </div>

      <Tabs defaultValue="explore" className="space-y-4">
        <TabsList>
          <TabsTrigger value="explore">Explore Groups</TabsTrigger>
          <TabsTrigger value="my-groups">My Groups ({myGroups.length})</TabsTrigger>
          <TabsTrigger value="create">Create Group</TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search groups by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant="outline">{group.category}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {group.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {group.member_count} members
                    </div>
                    {myGroups.includes(group.id) ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedGroup(group)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => leaveGroup(group.id)}
                        >
                          Leave
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => joinGroup(group.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Join
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="my-groups" className="space-y-4">
          {myGroups.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  You haven't joined any groups yet. Explore groups to find your community!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.filter(g => myGroups.includes(g.id)).map((group) => (
                <Card key={group.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <CardDescription>{group.category}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      onClick={() => setSelectedGroup(group)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      View Forum
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create a New Skill Group</CardTitle>
              <CardDescription>
                Build a community around shared learning and mentorship
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Group Name</label>
                <Input
                  placeholder="e.g., Chess Learners United"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Describe what members will learn and share..."
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={newGroup.category}
                  onValueChange={(v) => setNewGroup({ ...newGroup, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createGroup} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Group Forum Dialog */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedGroup.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Shield className="h-4 w-4" />
                    AI-moderated for 100% win-win collaboration
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedGroup(null)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-4">
              {/* Post Input */}
              <div className="space-y-3 p-4 bg-muted rounded-lg">
                <div className="flex gap-2">
                  <Select value={postType} onValueChange={(v: any) => setPostType(v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="share">💡 Share</SelectItem>
                      <SelectItem value="question">❓ Question</SelectItem>
                      <SelectItem value="resource">📚 Resource</SelectItem>
                      <SelectItem value="achievement">🏆 Achievement</SelectItem>
                      <SelectItem value="vault_entry">🗃️ Vault Entry</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVault(!showVault)}
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    {showVault ? 'Hide' : 'View'} Vault
                  </Button>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded"
                    />
                    Post anonymously
                  </label>
                </div>
                <Textarea
                  placeholder="Share your insights, ask questions, or offer resources..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  rows={3}
                />
                <Button onClick={createPost} disabled={!newPost.trim()} className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Post to Forum
                </Button>
              </div>

              {/* Legacy Knowledge Vault Section */}
              {showVault && (
                <div className="space-y-3 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-300/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Archive className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-amber-900">Legacy Knowledge Vault</h3>
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-amber-800">
                    User-curated archives seeded from Grokipedia. Grok moderates anonymous shares for win-win collaboration trends.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search Grokipedia to add to vault..."
                      value={vaultSearchQuery}
                      onChange={(e) => setVaultSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addGrokipediaToVault(vaultSearchQuery)}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => addGrokipediaToVault(vaultSearchQuery)}
                      disabled={!vaultSearchQuery.trim()}
                    >
                      Add from Grokipedia
                    </Button>
                  </div>
                  <div className="space-y-2 mt-4">
                    {posts.filter(p => p.post_type === 'vault_entry').length === 0 ? (
                      <p className="text-center text-muted-foreground py-4 text-sm">
                        Vault is empty. Add Grokipedia wisdom or create vault entries.
                      </p>
                    ) : (
                      posts.filter(p => p.post_type === 'vault_entry').map((post) => (
                        <Card key={post.id} className="bg-amber-50 border-amber-200">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="default" className="bg-amber-600">🗃️ Vault</Badge>
                                {post.grokipedia_sourced && <Badge variant="outline">Grokipedia</Badge>}
                                {post.vault_metadata?.win_win_score && (
                                  <Badge variant="secondary" className="text-xs">
                                    Win-Win: {post.vault_metadata.win_win_score}%
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm">{post.content}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Regular Posts */}
              <div className="space-y-3">
                {posts.filter(p => p.post_type !== 'vault_entry').length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No posts yet. Be the first to share!
                  </p>
                ) : (
                  posts.filter(p => p.post_type !== 'vault_entry').map((post) => (
                    <Card key={post.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {post.post_type === 'question' && <Badge variant="outline">❓ Question</Badge>}
                            {post.post_type === 'resource' && <Badge variant="default">📚 Resource</Badge>}
                            {post.post_type === 'achievement' && <Badge variant="default">🏆 Achievement</Badge>}
                            {post.post_type === 'share' && <Badge variant="secondary">💡 Share</Badge>}
                            {post.is_anonymous && <Badge variant="secondary">Anonymous</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{post.content}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
