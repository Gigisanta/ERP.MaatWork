"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { listAdvisorAliases, createAdvisorAlias, deleteAdvisorAlias, updateAdvisorAlias, type AdvisorAliasDto } from '@/lib/api/settings';
import { getAdvisors } from '@/lib/api/users';
import type { ApiErrorWithMessage, Advisor } from '@/types';
import { Button, Input, Select, Stack, Text, Card } from '@cactus/ui';

export default function AumAdvisorSettingsPage() {
  const [aliases, setAliases] = useState<AdvisorAliasDto[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newAlias, setNewAlias] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const advisorsOptions = useMemo(() => advisors.map(a => ({ value: a.id, label: a.fullName || a.email })), [advisors]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [aliasesResp, advisorsResp] = await Promise.all([listAdvisorAliases(), getAdvisors()]);
      if (aliasesResp.success && aliasesResp.data) setAliases(aliasesResp.data.aliases || []);
      if (advisorsResp.success && advisorsResp.data) setAdvisors(advisorsResp.data);
    } catch (e: unknown) {
      const err = e as ApiErrorWithMessage;
      setError(err.userMessage || err.message || 'Error cargando configuración');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      await createAdvisorAlias({ alias: newAlias, userId: newUserId });
      setNewAlias("");
      setNewUserId("");
      await load();
    } catch (e: unknown) {
      const err = e as ApiErrorWithMessage;
      setError(err.userMessage || err.message || 'Error creando alias');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      await deleteAdvisorAlias(id);
      await load();
    } catch (e: unknown) {
      const err = e as ApiErrorWithMessage;
      setError(err.userMessage || err.message || 'Error eliminando alias');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <Stack direction="row" justify="between" align="center" className="mb-4">
        <Text as="h1" weight="semibold" size="lg">AUM · Advisor Aliases</Text>
        <Link href="/admin">Volver</Link>
      </Stack>

      {error && (
        <Text size="sm" className="text-error mb-3">{error}</Text>
      )}

      <Card className="mb-6 p-4">
        <Text weight="medium" className="mb-2">Agregar alias</Text>
        <Stack direction="row" gap="sm" align="center">
          <Input
            placeholder="Alias exacto (se normaliza trim+lowercase)"
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            className="w-64"
          />
          <Select
            value={newUserId}
            onValueChange={setNewUserId}
            placeholder="Seleccionar asesor"
            options={advisorsOptions}
            className="w-64"
          />
          <Button onClick={onAdd} disabled={saving || !newAlias || !newUserId}>Agregar</Button>
        </Stack>
        <Text size="sm" color="secondary" className="mt-2">El alias hace match exacto tras normalizar: trim + lowercase.</Text>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alias</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Normalizado</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asesor</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              <tr><td className="px-4 py-4" colSpan={4}><Text>Cargando...</Text></td></tr>
            ) : aliases.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-sm text-gray-500" colSpan={4}>Sin alias</td></tr>
            ) : (
              aliases.map((a) => {
                const user = advisors.find(u => u.id === a.userId);
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-2 text-sm text-gray-700">{a.aliasRaw}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{a.aliasNormalized}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{user ? (user.fullName || user.email) : a.userId}</td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="danger" size="sm" onClick={() => onDelete(a.id)} disabled={saving}>Eliminar</Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}



