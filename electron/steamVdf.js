const TYPES = {
  OBJECT: 0x00,
  STRING: 0x01,
  INT: 0x02
};

const SPECIAL = {
  OBJECT_END: 0x08,
  STRING_END: 0x00
};

function makeCRCTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c >>> 0;
  }
  return table;
}

const crcTable = makeCRCTable();

function crc32(str) {
  const buf = Buffer.from(str, 'utf8');
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

export function generateAppId(exe, appName) {
  const cleanExe = exe.replace(/"/g, '');
  const key = `"${cleanExe}"${appName}`;
  const crc = crc32(key);
  const top = (crc | 0x80000000) >>> 0;
  return top.toString();
}

export function parseVdf(buffer) {
  let offset = 0;

  function parseString() {
    let start = offset;
    while (buffer.readUInt8(offset) !== SPECIAL.STRING_END) {
      offset++;
    }
    const val = buffer.toString('utf8', start, offset);
    offset++;
    return val;
  }

  function parseIntValue() {
    const val = buffer.readInt32LE(offset);
    offset += 4;
    return val;
  }

  function parseObject() {
    let obj = {};
    while (offset < buffer.length) {
      let type = buffer.readUInt8(offset);
      offset++;
      if (type === SPECIAL.OBJECT_END) break;

      let propName = parseString();
      let val;

      switch (type) {
        case TYPES.OBJECT:
          val = parseObject();
          break;
        case TYPES.STRING:
          val = parseString();
          break;
        case TYPES.INT:
          val = parseIntValue();
          break;
        default:
          throw new Error(`Unknown VDF type ${type} at offset ${offset}`);
      }
      obj[propName] = val;
    }

    const keys = Object.keys(obj);
    if (keys.length > 0 && keys.every(k => !isNaN(k))) {
      let arr = [];
      for (let k of keys) {
        arr[parseInt(k, 10)] = obj[k];
      }
      return arr;
    }

    return obj;
  }

  return parseObject();
}

export function writeVdf(obj) {
  let buffers = [];

  function writeString(str) {
    const buf = Buffer.from(str || '', 'utf8');
    const zero = Buffer.alloc(1);
    buffers.push(buf, zero);
  }

  function writeInt(val) {
    const buf = Buffer.alloc(4);
    buf.writeInt32LE(val || 0, 0);
    buffers.push(buf);
  }

  function writeObject(data) {
    const isArray = Array.isArray(data);
    const keys = isArray ? data.map((_, i) => i.toString()) : Object.keys(data);

    for (let key of keys) {
      const val = data[key];
      if (val === undefined || val === null) continue;

      let type;
      if (typeof val === 'string') type = TYPES.STRING;
      else if (typeof val === 'number' || typeof val === 'boolean') type = TYPES.INT;
      else type = TYPES.OBJECT;

      const typeBuf = Buffer.alloc(1);
      typeBuf.writeUInt8(type, 0);
      buffers.push(typeBuf);

      writeString(key);

      switch (type) {
        case TYPES.OBJECT:
          writeObject(val);
          break;
        case TYPES.STRING:
          writeString(val);
          break;
        case TYPES.INT:
          writeInt(typeof val === 'boolean' ? (val ? 1 : 0) : val);
          break;
      }
    }

    const endBuf = Buffer.alloc(1);
    endBuf.writeUInt8(SPECIAL.OBJECT_END, 0);
    buffers.push(endBuf);
  }

  writeObject(obj);
  return Buffer.concat(buffers);
}
