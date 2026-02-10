import { useState, useEffect } from 'react';

interface Plan {
  id: string;
  name: string;
  description: string;
  pricing: {
    monthly: number;
    annual: number;
    currency: string;
    annualDiscount: number;
  };
  limits: {
    messagesPerDay: number;
    instancesLimit: number;
  };
  features: {
    hasWebhooks: boolean;
    hasTemplates: boolean;
    hasSmsIncluded: boolean;
  };
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In dev, using localhost:3001
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    fetch(`${API_URL}/api/pricing`)
      .then(res => res.json())
      .then(data => {
        setPlans(data.plans || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch plans", err);
        setLoading(false);
      });
  }, []);

  const getPlan = (planId: string) => plans.find(p => p.id === planId);
  
  const formatLimit = (value: number) => value === -1 ? 'Ilimitado' : value.toLocaleString('pt-BR');
  
  const formatPrice = (price: number) => {
    if (price === 0) return 'Grátis';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  return { plans, loading, getPlan, formatLimit, formatPrice };
}
