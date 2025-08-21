# Memory Optimization for Large Excel File Processing

## Problem
Your Node.js application was running out of memory when processing Excel files with 300,000+ records, causing the error:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

## Solution Implemented

### 1. Streaming Excel Processing
- **Before**: Loaded entire Excel file into memory at once using `XLSX.utils.sheet_to_json()`
- **After**: Process Excel file in chunks of 1000 rows at a time using cell-by-cell reading

### 2. Memory Management
- **Garbage Collection**: Force garbage collection every 10 chunks to free memory
- **Chunk Processing**: Process data in smaller batches to prevent memory accumulation
- **Progress Tracking**: Update progress every 5 chunks to monitor processing

### 3. PM2 Configuration
- **Heap Size**: Increased from default (~1.4GB) to 4GB (`--max-old-space-size=4096`)
- **Garbage Collection**: Enabled explicit garbage collection (`--expose-gc`)
- **Memory Optimization**: Added memory optimization flags
- **Auto-restart**: Restart process if memory exceeds 3GB

## Files Modified

### 1. `routes/excel.js`
- Updated Excel upload processing to use streaming approach
- Implemented chunk-based processing (1000 rows per chunk)
- Added memory cleanup with garbage collection

### 2. `routes/money.js`
- Updated money import processing to use streaming approach
- Implemented chunk-based processing for large files
- Added progress tracking and memory management

### 3. `ecosystem.config.js` (New)
- PM2 configuration with memory optimization settings
- Increased heap size to 4GB
- Enabled garbage collection
- Auto-restart on memory limit

### 4. `restart-with-memory-optimization.sh` (New)
- Script to restart PM2 processes with new configuration

## Deployment Instructions

### Step 1: Upload Changes
Upload the modified files to your AWS server:
- `routes/excel.js`
- `routes/money.js`
- `ecosystem.config.js`
- `restart-with-memory-optimization.sh`

### Step 2: Make Script Executable
```bash
chmod +x restart-with-memory-optimization.sh
```

### Step 3: Restart with New Configuration
```bash
./restart-with-memory-optimization.sh
```

### Step 4: Verify
```bash
# Check PM2 status
pm2 status

# Monitor memory usage
pm2 monit

# Check logs
pm2 logs repotrack-backend
```

## Performance Improvements

### Memory Usage
- **Before**: Could crash with 300K+ records
- **After**: Can handle 300K+ records with 4GB heap

### Processing Speed
- **Chunked Processing**: Better memory management
- **Bulk Operations**: Faster database inserts
- **Progress Tracking**: Real-time progress updates

### Monitoring
- **Memory Monitoring**: PM2 auto-restart on memory limit
- **Log Tracking**: Detailed processing logs
- **Error Handling**: Better error reporting

## Testing Large Files

### Test with Your 3 Lakh File
1. Upload your Excel file with 300,000 records
2. Monitor the processing in real-time
3. Check PM2 logs for any issues
4. Verify all records are processed correctly

### Expected Behavior
- Processing will take longer but won't crash
- Memory usage will stay within limits
- Progress updates every 5 chunks
- Automatic garbage collection every 10 chunks

## Troubleshooting

### If Still Getting Memory Errors
1. Check available system memory: `free -h`
2. Increase heap size in `ecosystem.config.js` if needed
3. Reduce chunk size in the code if necessary
4. Monitor with `pm2 monit`

### If Processing is Slow
1. This is expected for large files
2. Monitor progress in the frontend
3. Check PM2 logs for any bottlenecks
4. Consider increasing chunk size if memory allows

## Monitoring Commands

```bash
# Check PM2 status
pm2 status

# Monitor memory and CPU
pm2 monit

# View backend logs
pm2 logs repotrack-backend

# View frontend logs
pm2 logs repotrack-frontend

# Check system memory
free -h

# Check disk space
df -h
```

## Success Indicators

✅ No more "heap out of memory" errors  
✅ Processing completes successfully  
✅ All 300K records are imported  
✅ Memory usage stays within limits  
✅ PM2 processes remain stable  

Your application should now handle large Excel files without memory issues!
