'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCanaryPage() {
  const [updating, setUpdating] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

  const updateCanary = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/admin/update-canary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      });

      if (response.ok) {
        toast.success('Canary updated successfully!');
      } else {
        toast.error('Failed to update canary');
      }
    } catch (error) {
      toast.error('Error updating canary');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-neon-green" />
          <h1 className="text-3xl font-bold text-neon-green">WARRANT CANARY</h1>
        </div>

        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold text-neon-green mb-4">Monthly Update</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-neon-green/60" />
              <span className="text-neon-green/60">Today:</span>
              <span className="text-neon-green font-mono">{today}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-neon-green/60" />
              <span className="text-neon-green/60">Next:</span>
              <span className="text-neon-green font-mono">{nextMonth}</span>
            </div>
          </div>

          <div className="bg-dark-bg/50 border border-neon-green/20 rounded p-4 mb-6">
            <div className="space-y-2 text-xs text-neon-green/80">
              <div>✅ No warrants/subpoenas/NSLs received</div>
              <div>✅ No gag orders in effect</div>
              <div>✅ No government data requests</div>
              <div>✅ No forced time manipulation</div>
              <div>✅ Infrastructure under control</div>
              <div>✅ No backdoors/compromises</div>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-500">
                Only update if ALL items above are true
              </div>
            </div>
          </div>

          <Button onClick={updateCanary} disabled={updating} className="w-full">
            {updating ? 'UPDATING...' : 'UPDATE CANARY'}
          </Button>
        </Card>

        <Card className="p-6">
          <a href="/canary.txt" target="_blank" className="text-neon-green hover:underline">
            View Current Canary →
          </a>
        </Card>
      </div>
    </div>
  );
}
