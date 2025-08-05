'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';

export function PutzdiensteUpload() {
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

      const putzdienste = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const ort = row[0];
        const beschreibung = row[1] || '';
        const personen = row.slice(2).filter(name => !!name);

        if (ort && personen.length > 0) {
          putzdienste.push({
            ort: ort,
            beschreibung: beschreibung,
            mitglieder: personen
          });
        }
      }

      // Alte Einträge löschen
      const { error: deleteError } = await supabase
        .from('putzdienste')
        .delete()
        .not('id', 'is', null);
      if (deleteError) throw deleteError;

      // Neue Einträge speichern
      const { error: insertError } = await supabase
        .from('putzdienste')
        .insert(putzdienste);
      if (insertError) throw insertError;

      setSuccessMessage('Putzdienste erfolgreich aktualisiert!');
    } catch (error) {
      alert('Fehler beim Verarbeiten der Datei: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-8 p-4 border rounded shadow-sm">
      <h2 className="text-xl font-bold mb-2">Putzdienste aktualisieren (nur Admin)</h2>

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
