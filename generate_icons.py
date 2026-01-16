#!/usr/bin/env python3
"""
Generate PNG icons for the Step Recorder extension.
Creates icon16.png, icon48.png, and icon128.png
"""

import struct
import zlib

def create_png(width, height, pixels):
    """Create a PNG file from pixel data"""
    def write_chunk(file, chunk_type, data):
        file.write(struct.pack('>I', len(data)))
        file.write(chunk_type)
        file.write(data)
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        file.write(struct.pack('>I', crc))
    
    # PNG signature
    png_signature = b'\x89PNG\r\n\x1a\n'
    
    # Create pixel data
    pixel_data = b''
    for row in pixels:
        pixel_data += b'\x00'  # Filter byte (none)
        for pixel in row:
            pixel_data += pixel
    
    # Compress pixel data
    compressed = zlib.compress(pixel_data, 9)
    
    # Create IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    
    # Write PNG file
    with open(f'icon{width}.png', 'wb') as f:
        f.write(png_signature)
        write_chunk(f, b'IHDR', ihdr_data)
        write_chunk(f, b'IDAT', compressed)
        write_chunk(f, b'IEND', b'')

def generate_icon(size):
    """Generate an icon with a blue background and red record button"""
    # Colors: Blue background (#2196F3), White circle, Red inner circle (#F44336)
    blue = (0x21, 0x96, 0xF3)
    white = (0xFF, 0xFF, 0xFF)
    red = (0xF4, 0x43, 0x36)
    
    pixels = []
    center_x, center_y = size // 2, size // 2
    outer_radius = int(size * 0.35)
    inner_radius = int(size * 0.18)
    
    for y in range(size):
        row = []
        for x in range(size):
            dx = x - center_x
            dy = y - center_y
            dist_sq = dx * dx + dy * dy
            
            if dist_sq <= inner_radius * inner_radius:
                # Red inner circle
                row.append(struct.pack('>BBB', *red))
            elif dist_sq <= outer_radius * outer_radius:
                # White outer circle
                row.append(struct.pack('>BBB', *white))
            else:
                # Blue background
                row.append(struct.pack('>BBB', *blue))
        pixels.append(row)
    
    create_png(size, size, pixels)
    print(f'Created icon{size}.png')

if __name__ == '__main__':
    for size in [16, 48, 128]:
        generate_icon(size)
    print('All icons created successfully!')
