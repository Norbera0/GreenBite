"use client";

import type { NextPage } from 'next';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/app-context';
import { Leaf } from 'lucide-react';

const LoginPage: NextPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { login } = useAppContext();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      await login(name, email);
      router.push('/');
    } else {
      // Basic validation feedback (consider using ShadCN toast)
      alert('Please enter both name and email.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-secondary to-background p-4">
      <Card className="w-full max-w-sm shadow-xl border-primary/20">
         <CardHeader className="text-center">
           <div className="flex justify-center mb-4">
              <Leaf size={48} className="text-primary" />
           </div>
          <CardTitle className="text-2xl font-semibold text-primary">Welcome to EcoPlate</CardTitle>
          <CardDescription>Log in to track your meal's carbon footprint.</CardDescription>
          <p className="text-xs text-muted-foreground mt-2">(Demo Login: No password required)</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                 className="bg-card"
              />
            </div>
             <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              Log In / Sign Up
            </Button>
          </form>
        </CardContent>
         <CardFooter className="text-center text-xs text-muted-foreground">
           <p>This simple login is for identification purposes in this demo.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;
