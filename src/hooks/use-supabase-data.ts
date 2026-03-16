import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientRow {
  id: string;
  name: string;
  sort_order: number | null;
  created_at: string | null;
}

export interface ProductRow {
  id: string;
  client_id: string | null;
  code: string;
  name: string;
  label: string;
  color: string | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface ProjectRow {
  id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  status: string | null;
  deadline: string | null;
  overall_deadline: string | null;
  project_code: string | null;
  sort_order: number | null;
  created_at: string | null;
  created_by: string | null;
}

export function useClients() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('sort_order');
    setClients(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);
  return { clients, loading, refetch: fetch };
}

export function useProducts(clientId: string | null) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!clientId) { setProducts([]); return; }
    setLoading(true);
    supabase.from('products').select('*').eq('client_id', clientId).order('sort_order')
      .then(({ data }) => { setProducts(data ?? []); setLoading(false); });
  }, [clientId]);

  return { products, loading };
}

export function useProjects(productId: string | null) {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    if (!productId) { setProjects([]); return; }
    setLoading(true);
    const { data } = await supabase.from('projects').select('*').eq('product_id', productId).order('sort_order');
    setProjects(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [productId]);
  return { projects, loading, refetch: fetch };
}

export function useProductCount(clientId: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!clientId) { setCount(0); return; }
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('client_id', clientId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [clientId]);
  return count;
}

export function useProjectCount(productId: string | null) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!productId) { setCount(0); return; }
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('product_id', productId)
      .then(({ count: c }) => setCount(c ?? 0));
  }, [productId]);
  return count;
}

export function useClientCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    supabase.from('clients').select('id', { count: 'exact', head: true })
      .then(({ count: c }) => setCount(c ?? 0));
  }, []);
  return count;
}
