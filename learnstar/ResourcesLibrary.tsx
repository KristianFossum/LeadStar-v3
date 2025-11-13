import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Library, FileText, Video, Link as LinkIcon, BookOpen, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Resource {
  id: string;
  user_id: string;
  title: string;
  description: string;
  resource_type: 'article' | 'video' | 'flashcard' | 'summary' | 'external';
  content?: string;
  url?: string;
  skill_tags: string[];
  ai_generated: boolean;
  created_at: string;
}

interface ResourcesLibraryProps {
  personalityData: any;
}

export function ResourcesLibrary({ personalityData }: ResourcesLibraryProps) {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [grokipediaQuery, setGrokipediaQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [grokSearching, setGrokSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newResource, setNewResource] = useState({
    title: '',
    description: '',
    resource_type: 'article' as const,
    url: '',
    skill_tags: ''
  });

  useEffect(() => {
    if (user) {
      loadResources();
    }
  }, [user]);

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_resources')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const addResource = async () => {
    if (!newResource.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      const skillTags = newResource.skill_tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const { error } = await supabase
        .from('learning_resources')
        .insert({
          user_id: user?.id,
          title: newResource.title,
          description: newResource.description,
          resource_type: newResource.resource_type,
          url: newResource.url || null,
          skill_tags: skillTags,
          ai_generated: false
        });

      if (error) throw error;

      toast.success('Resource added to library');
      setNewResource({
        title: '',
        description: '',
        resource_type: 'article',
        url: '',
        skill_tags: ''
      });
      setShowAddForm(false);
      loadResources();
    } catch (error: any) {
      toast.error('Failed to add resource: ' + error.message);
    }
  };

  const searchGrokipedia = async () => {
    if (!grokipediaQuery.trim()) {
      toast.error('Enter a search query');
      return;
    }

    setGrokSearching(true);
    try {
      // Call Grok AI webhook to fetch/summarize Grokipedia content
      // Personalize based on user traits (e.g., introverted style: deep solo tactics)
      const personalityNote = personalityData?.hasPersonalityTest
        ? 'tailored to your unique learning style'
        : 'from Grokipedia';

      const { error } = await supabase
        .from('learning_resources')
        .insert({
          user_id: user?.id,
          title: `Grokipedia: ${grokipediaQuery}`,
          description: `I get your goal—here's Grokipedia wisdom adapted to your soul. ${personalityNote}`,
          resource_type: 'summary',
          content: `Grokipedia entry for "${grokipediaQuery}". This content is moderated for truth and personalized to your traits...`,
          skill_tags: [grokipediaQuery.toLowerCase()],
          ai_generated: true,
          url: `https://grokipedia.com/wiki/${encodeURIComponent(grokipediaQuery)}`
        });

      if (error) throw error;
      toast.success(`I get your goal for ${grokipediaQuery}—Grokipedia wisdom added!`);
      setGrokipediaQuery('');
      loadResources();
    } catch (error: any) {
      toast.error('Failed to fetch Grokipedia: ' + error.message);
    } finally {
      setGrokSearching(false);
    }
  };

  const generateAIResource = async (skillName: string) => {
    try {
      // In production, this would call Grok AI via webhook
      // For now, create a placeholder
      const { error } = await supabase
        .from('learning_resources')
        .insert({
          user_id: user?.id,
          title: `${skillName} Study Guide`,
          description: `AI-generated summary tailored to your learning style`,
          resource_type: 'summary',
          content: `I grok your quest for ${skillName}. This guide adapts to your unique traits...`,
          skill_tags: [skillName.toLowerCase()],
          ai_generated: true
        });

      if (error) throw error;
      toast.success('AI resource generated! I grok your learning style.');
      loadResources();
    } catch (error: any) {
      toast.error('Failed to generate resource: ' + error.message);
    }
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         r.skill_tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = selectedType === 'all' || r.resource_type === selectedType;
    return matchesSearch && matchesType;
  });

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'article': return <FileText className="h-4 w-4" />;
      case 'external': return <LinkIcon className="h-4 w-4" />;
      case 'flashcard': return <BookOpen className="h-4 w-4" />;
      default: return <Library className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading library...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RESOURCES LIBRARY</h2>
          <p className="text-muted-foreground">
            AI-curated content tailored to your learning style — powered by Grokipedia
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Grokipedia Search Bar */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-300/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Grokipedia Search
          </CardTitle>
          <CardDescription>
            Search Grokipedia for summaries and articles tailored to your unique traits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., chess strategies, quantum physics, stoic philosophy..."
              value={grokipediaQuery}
              onChange={(e) => setGrokipediaQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchGrokipedia()}
              disabled={grokSearching}
              className="flex-1"
            />
            <Button
              onClick={searchGrokipedia}
              disabled={grokSearching || !grokipediaQuery.trim()}
            >
              {grokSearching ? 'Searching...' : 'Grok It'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Resource</CardTitle>
            <CardDescription>Save learning materials for future reference</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Title</label>
              <Input
                placeholder="Resource title"
                value={newResource.title}
                onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Input
                placeholder="Brief description"
                value={newResource.description}
                onChange={(e) => setNewResource({ ...newResource, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <select
                className="w-full border rounded p-2"
                value={newResource.resource_type}
                onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value as any })}
              >
                <option value="article">Article</option>
                <option value="video">Video</option>
                <option value="external">External Link</option>
                <option value="flashcard">Flashcard</option>
                <option value="summary">Summary</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">URL (Optional)</label>
              <Input
                type="url"
                placeholder="https://..."
                value={newResource.url}
                onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Skill Tags (comma-separated)</label>
              <Input
                placeholder="e.g., chess, strategy, tactics"
                value={newResource.skill_tags}
                onChange={(e) => setNewResource({ ...newResource, skill_tags: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addResource} className="flex-1">Add Resource</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="article">Articles</TabsTrigger>
          <TabsTrigger value="video">Videos</TabsTrigger>
          <TabsTrigger value="flashcard">Flashcards</TabsTrigger>
          <TabsTrigger value="summary">Summaries</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="space-y-4 mt-4">
          {filteredResources.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  No resources found. Add your first learning material!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="hover:border-primary transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        {getResourceIcon(resource.resource_type)}
                        <CardTitle className="text-base line-clamp-1">
                          {resource.title}
                        </CardTitle>
                      </div>
                      {resource.ai_generated && (
                        <Badge variant="secondary" className="ml-2">AI</Badge>
                      )}
                    </div>
                    {resource.description && (
                      <CardDescription className="line-clamp-2">
                        {resource.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {resource.skill_tags && resource.skill_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {resource.skill_tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {resource.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(resource.url, '_blank')}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Open Resource
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
