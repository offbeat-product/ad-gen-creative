import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません');
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(210, 40%, 98%) 0%, hsl(241, 100%, 96%) 100%)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-md rounded-2xl bg-card p-8 shadow-elevated"
      >
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold brand-gradient-text mb-2">∞ Ad Gen</h1>
          <p className="text-sm text-muted-foreground">ルールと勝ちパターンから、AIがクリエイティブを生成。</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
