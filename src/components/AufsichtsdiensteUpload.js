'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';

export function AufsichtsdiensteUpload() {
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const aufsichtsdienste = [];

      for (let i = 1; i < rows.length; i++) { // Erste Zeile ist Header
        const row = rows[i];
        const ort = row[0];
        const personen = row.slice(1).filter(name => !!name); // Nur nicht-leere Namen

        if (ort && personen.length > 0) {
          aufsichtsdienste.push({
            ort: ort,
            mitglieder: personen
          });
        }
      }

      // 1. Alte Einträge löschen
      const { error: deleteError } = await supabase.from('aufsichtsdienste').delete().not('id', 'is', null);
      if (deleteError) throw deleteError;

      // 2. Neue Einträge speichern
      const { error: insertError } = await supabase.from('aufsichtsdienste').insert(aufsichtsdienste);
      if (insertError) throw insertError;

      setSuccessMessage('Aufsichtsdienste erfolgreich aktualisiert!');
    } catch (error) {
      alert('Fehler beim Verarbeiten der Datei: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-8 p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-2">Aufsichtsdienste aktualisieren (nur Admin)</h2>

      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFile}
        disabled={uploading}
        className="mb-2"
      />

      {uploading && <p className="text-gray-500">Verarbeite Datei...</p>}
      {successMessage && <p className="text-green-600">{successMessage}</p>}
    </div>
  );
}
