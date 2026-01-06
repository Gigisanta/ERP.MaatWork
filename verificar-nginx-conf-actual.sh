#!/bin/bash
# Verificar qué hay realmente en nginx.conf
echo "=== Contenido de /etc/nginx/nginx.conf ==="
echo ""
echo "Líneas 70-100:"
sudo sed -n '70,100p' /etc/nginx/nginx.conf
echo ""
echo "Buscando 'ssl':"
sudo grep -n "ssl" /etc/nginx/nginx.conf
echo ""
echo "Buscando '443':"
sudo grep -n "443" /etc/nginx/nginx.conf
echo ""
echo "Buscando 'server':"
sudo grep -n "^[[:space:]]*server[[:space:]]*{" /etc/nginx/nginx.conf
echo ""
echo "=== Comparar con /home/ec2-user/nginx.conf ==="
echo "Buscando 'ssl' en home:"
grep -n "ssl" /home/ec2-user/nginx.conf | head -5
echo ""
echo "Buscando '443' en home:"
grep -n "443" /home/ec2-user/nginx.conf | head -5
echo ""
echo "=== Verificar si los archivos son diferentes ==="
diff /home/ec2-user/nginx.conf /etc/nginx/nginx.conf | head -20
