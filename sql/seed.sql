insert into nodes (node_code, name, api_token, location_name, crop)
values (
  'TR-FITO-001',
  'Nodo fitomonitoreo prueba',
  'cambia-este-token-largo',
  'Huéscar - prueba',
  'almendro'
)
on conflict (node_code) do nothing;