const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const ExcelVehicle = require('../models/ExcelVehicle');
const puppeteer = require('puppeteer');
const pdf = require('html-pdf');

const router = express.Router();

// Helper function to generate HTML template for inventory PDF
function generateInventoryHTML(inventory) {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  // Sanitize all inventory data to prevent HTML injection and handle undefined values
  const safeValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    return String(value).replace(/[<>]/g, ''); // Basic HTML sanitization
  };

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Inventory - ${inventory.inventoryNumber}</title>
                           <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 8px;
            color: #333;
            font-size: 15px;
            line-height: 1.3;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 5px;
            margin-bottom: 8px;
          }
          .title {
            font-size: 27px;
            font-weight: bold;
            color: #2563eb;
            margin: 0;
          }
          .inventory-number {
            font-size: 16px;
            color: #666;
            margin: 3px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }
          th {
            background-color: #2563eb;
            color: white;
            font-size: 15px;
            padding: 4px 7px;
            text-align: left;
            border: 1px solid #ddd;
          }
          td {
            font-size: 15px;
            padding: 4px 7px;
            border: 1px solid #ddd;
            vertical-align: top;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            background-color: #f0f0f0;
            padding: 4px 7px;
            margin: 4px 0;
          }
          .equipment-table {
            width: 100%;
            border-collapse: collapse;
          }
          .equipment-table th {
            background-color: #f8f9fa;
            color: #333;
            font-size: 13px;
            padding: 3px 4px;
          }
          .equipment-table td {
            font-size: 13px;
            padding: 3px 4px;
          }
          .footer {
            margin-top: 6px;
            text-align: center;
            font-size: 13px;
            color: #666;
            border-top: 1px solid #e5e7eb;
            padding-top: 4px;
          }
          .signature-section {
            margin-top: 20px;
            margin-bottom: 10px;
          }
          .signature-row {
            display: flex;
            justify-content: space-between;
            gap: 20px;
          }
          .signature-box {
            flex: 1;
            text-align: center;
          }
          .signature-line {
            width: 100%;
            height: 2px;
            background-color: #000;
            margin-bottom: 8px;
            border-radius: 1px;
          }
          .signature-space {
            width: 100%;
            height: 60px;
            border: 1px dashed #ccc;
            background-color: #fafafa;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #999;
            font-size: 11px;
          }
          .signature-label {
            font-size: 12px;
            font-weight: bold;
            color: #333;
            text-transform: uppercase;
          }
        @media print {
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 class="title">INVENTORY</h1>
        <div class="inventory-number">Inventory #${safeValue(inventory.inventoryNumber)} | Generated: ${formatDate(inventory.createdAt)}</div>
      </div>

      <table>
        <tr>
          <th colspan="4">Agency Information</th>
        </tr>
        <tr>
          <td><strong>Agency Name:</strong></td>
          <td>${safeValue(inventory.adminName)}</td>
          <td><strong>Seizure Agent:</strong></td>
          <td>${safeValue(inventory.fieldAgentName)}</td>
        </tr>
        <tr>
          <td><strong>Phone Number:</strong></td>
          <td>${safeValue(inventory.fieldAgentPhone)}</td>
          <td><strong>Seizure Date:</strong></td>
          <td>${formatDate(inventory.seizureDate)}</td>
        </tr>
      </table>

      <table>
        <tr>
          <th colspan="4">Vehicle Information</th>
        </tr>
        <tr>
          <td><strong>Registration Number:</strong></td>
          <td>${safeValue(inventory.registrationNumber)}</td>
          <td><strong>Customer Name:</strong></td>
          <td>${safeValue(inventory.customerName)}</td>
        </tr>
        <tr>
          <td><strong>Make:</strong></td>
          <td>${safeValue(inventory.make)}</td>
          <td><strong>Chassis Number:</strong></td>
          <td>${safeValue(inventory.chasisNumber)}</td>
        </tr>
        <tr>
          <td><strong>Engine Number:</strong></td>
          <td>${safeValue(inventory.engineNumber)}</td>
          <td></td>
          <td></td>
        </tr>
      </table>

      <table>
        <tr>
          <th colspan="4">Driver Information</th>
        </tr>
        <tr>
          <td><strong>Driver Name:</strong></td>
          <td>${safeValue(inventory.driverName)}</td>
          <td><strong>Driver Number:</strong></td>
          <td>${safeValue(inventory.driverNumber)}</td>
        </tr>
      </table>

      ${inventory.speedMeterReading || inventory.originalRCBook || inventory.insurancePolicyUpto ? `
      <table>
        <tr>
          <th colspan="4">Basic Vehicle Details</th>
        </tr>
        <tr>
          ${inventory.speedMeterReading ? `<td><strong>Speed Meter:</strong></td><td>${safeValue(inventory.speedMeterReading)} KMS</td>` : '<td></td><td></td>'}
          ${inventory.originalRCBook ? `<td><strong>RC Book:</strong></td><td>${safeValue(inventory.originalRCBook)}</td>` : '<td></td><td></td>'}
        </tr>
        ${inventory.insurancePolicyUpto ? `
        <tr>
          <td><strong>Insurance Policy:</strong></td>
          <td colspan="3">${formatDate(inventory.insurancePolicyUpto)}</td>
        </tr>
        ` : ''}
      </table>
      ` : ''}

      ${inventory.parkingYardName || inventory.parkingExpensesPerDay || inventory.keyAvailability ? `
      <table>
        <tr>
          <th colspan="4">Parking Information</th>
        </tr>
        <tr>
          ${inventory.parkingYardName ? `<td><strong>Parking Yard:</strong></td><td>${safeValue(inventory.parkingYardName)}</td>` : '<td></td><td></td>'}
          ${inventory.parkingExpensesPerDay ? `<td><strong>Daily Expenses:</strong></td><td>${safeValue(inventory.parkingExpensesPerDay)}</td>` : '<td></td><td></td>'}
        </tr>
        ${inventory.keyAvailability ? `
        <tr>
          <td><strong>Key Availability:</strong></td>
          <td colspan="3">${safeValue(inventory.keyAvailability)}</td>
        </tr>
        ` : ''}
      </table>
      ` : ''}

      ${inventory.tyreMake || inventory.tyreConditionFront || inventory.tyreConditionRear ? `
      <table>
        <tr>
          <th colspan="4">Tyre Information</th>
        </tr>
        <tr>
          ${inventory.tyreMake ? `<td><strong>Tyre Make:</strong></td><td>${safeValue(inventory.tyreMake)}</td>` : '<td></td><td></td>'}
          ${inventory.tyreConditionFront ? `<td><strong>Front Condition:</strong></td><td>${safeValue(inventory.tyreConditionFront)}</td>` : '<td></td><td></td>'}
        </tr>
        ${inventory.tyreConditionRear ? `
        <tr>
          <td><strong>Rear Condition:</strong></td>
          <td colspan="3">${safeValue(inventory.tyreConditionRear)}</td>
        </tr>
        ` : ''}
      </table>
      ` : ''}

      ${inventory.bodyType || inventory.bodyCondition || inventory.numberOfWheels ? `
      <table>
        <tr>
          <th colspan="4">Body Information</th>
        </tr>
        <tr>
          ${inventory.bodyType ? `<td><strong>Body Type:</strong></td><td>${safeValue(inventory.bodyType)}</td>` : '<td></td><td></td>'}
          ${inventory.bodyCondition ? `<td><strong>Body Condition:</strong></td><td>${safeValue(inventory.bodyCondition)}</td>` : '<td></td><td></td>'}
        </tr>
        ${inventory.numberOfWheels ? `
        <tr>
          <td><strong>Number of Wheels:</strong></td>
          <td colspan="3">${safeValue(inventory.numberOfWheels)}</td>
        </tr>
        ` : ''}
      </table>
      ` : ''}

      ${inventory.airConditioner || inventory.jockeyWithRod || inventory.toolSet || inventory.rearViewMirror || inventory.stephnee || inventory.tarpaulinRope || inventory.tutorAmplifier || inventory.stereoSet || inventory.battery || inventory.seatCovers || inventory.wiper ? `
      <table class="equipment-table">
        <tr>
          <th colspan="6">Equipment & Accessories</th>
        </tr>
        <tr>
          ${inventory.airConditioner ? `<td><strong>AC:</strong> ${safeValue(inventory.airConditioner)}</td>` : '<td></td>'}
          ${inventory.jockeyWithRod ? `<td><strong>Jockey:</strong> ${safeValue(inventory.jockeyWithRod)}</td>` : '<td></td>'}
          ${inventory.toolSet ? `<td><strong>Tool Set:</strong> ${safeValue(inventory.toolSet)}</td>` : '<td></td>'}
          ${inventory.rearViewMirror ? `<td><strong>Mirror:</strong> ${safeValue(inventory.rearViewMirror)}</td>` : '<td></td>'}
          ${inventory.stephnee ? `<td><strong>Stephnee:</strong> ${safeValue(inventory.stephnee)}</td>` : '<td></td>'}
          ${inventory.tarpaulinRope ? `<td><strong>Tarpaulin:</strong> ${safeValue(inventory.tarpaulinRope)}</td>` : '<td></td>'}
        </tr>
        <tr>
          ${inventory.tutorAmplifier ? `<td><strong>Amplifier:</strong> ${safeValue(inventory.tutorAmplifier)}</td>` : '<td></td>'}
          ${inventory.stereoSet ? `<td><strong>Stereo:</strong> ${safeValue(inventory.stereoSet)}</td>` : '<td></td>'}
          ${inventory.battery ? `<td><strong>Battery:</strong> ${safeValue(inventory.battery)}</td>` : '<td></td>'}
          ${inventory.seatCovers ? `<td><strong>Seat Covers:</strong> ${safeValue(inventory.seatCovers)}</td>` : '<td></td>'}
          ${inventory.wiper ? `<td><strong>Wiper:</strong> ${safeValue(inventory.wiper)}</td>` : '<td></td>'}
          <td></td>
        </tr>
      </table>
      ` : ''}

      ${inventory.otherSpecificItems ? `
      <table>
        <tr>
          <th colspan="4">Other Specific Items</th>
        </tr>
        <tr>
          <td><strong>Additional Items:</strong></td>
          <td colspan="3">${safeValue(inventory.otherSpecificItems)}</td>
        </tr>
      </table>
      ` : ''}

                           <div class="signature-section">
          <div class="signature-row">
            <div class="signature-box">
              <div class="signature-space">Signature Space</div>
              <div class="signature-line"></div>
              <div class="signature-label">Driver Sign</div>
            </div>
            <div class="signature-box">
              <div class="signature-space">Signature & Stamp Space</div>
              <div class="signature-line"></div>
              <div class="signature-label">Yard Sign & Stamp</div>
            </div>
            <div class="signature-box">
              <div class="signature-space">Signature & Stamp Space</div>
              <div class="signature-line"></div>
              <div class="signature-label">Agent Sign & Stamp</div>
            </div>
          </div>
        </div>

       <div class="footer">
         <p>Generated by: ${safeValue(inventory.fieldAgentName)} | Inventory #${safeValue(inventory.inventoryNumber)}</p>
       </div>
    </body>
    </html>
  `;
}

// Get inventories for field agent (only their own)
router.get('/field-agent', authenticateToken, authorizeRole('fieldAgent'), async (req, res) => {
  try {
    const inventories = await Inventory.find({ 
      fieldAgentId: req.user._id 
    })
    .populate('vehicleId', 'registration_number customer_name make chasis_number engine_number')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: inventories
    });
  } catch (error) {
    console.error('Error fetching field agent inventories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get inventories for admin (from their field agents)
router.get('/admin', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Get all field agents created by this admin
    const fieldAgents = await User.find({ 
      createdBy: req.user._id,
      role: 'fieldAgent'
    }).select('_id');
    
    const fieldAgentIds = fieldAgents.map(agent => agent._id);
    
    const inventories = await Inventory.find({ 
      fieldAgentId: { $in: fieldAgentIds }
    })
    .populate('vehicleId', 'registration_number customer_name make chasis_number engine_number')
    .populate('fieldAgentId', 'name email')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: inventories
    });
  } catch (error) {
    console.error('Error fetching admin inventories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get inventories for auditor (from their admin's field agents)
router.get('/auditor', authenticateToken, authorizeRole('auditor'), async (req, res) => {
  try {
    // Get the auditor's admin
    const user = await User.findById(req.user._id).populate('createdBy');
    
    if (!user || !user.createdBy) {
      return res.status(404).json({
        success: false,
        message: 'User not associated with any admin'
      });
    }
    
    // Get all field agents created by the admin
    const fieldAgents = await User.find({ 
      createdBy: user.createdBy._id,
      role: 'fieldAgent'
    }).select('_id');
    
    const fieldAgentIds = fieldAgents.map(agent => agent._id);
    
    const inventories = await Inventory.find({ 
      fieldAgentId: { $in: fieldAgentIds }
    })
    .populate('vehicleId', 'registration_number customer_name make chasis_number engine_number')
    .populate('fieldAgentId', 'name email')
    .populate('adminId', 'name')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: inventories
    });
  } catch (error) {
    console.error('Error fetching auditor inventories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Create new inventory (field agent only)
router.post('/', authenticateToken, authorizeRole('fieldAgent'), async (req, res) => {
  try {
    const {
      vehicleId,
      driverName,
      driverNumber,
      speedMeterReading,
      originalRCBook,
      insurancePolicyUpto,
      parkingYardName,
      parkingExpensesPerDay,
      keyAvailability,
      tyreConditionFront,
      tyreConditionRear,
      tyreMake,
      bodyType,
      bodyCondition,
      numberOfWheels,
      airConditioner,
      jockeyWithRod,
      toolSet,
      rearViewMirror,
      stephnee,
      tarpaulinRope,
      tutorAmplifier,
      stereoSet,
      battery,
      seatCovers,
      wiper,
      otherSpecificItems
    } = req.body;

    // Validate required fields
    if (!vehicleId || !driverName || !driverNumber) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID, driver name, and driver number are required'
      });
    }

    // Get vehicle data
    const vehicle = await ExcelVehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Get field agent's admin
    const fieldAgent = await User.findById(req.user._id).populate('createdBy');
    if (!fieldAgent || !fieldAgent.createdBy) {
      return res.status(404).json({
        success: false,
        message: 'Field agent not associated with any admin'
      });
    }

    // Allow multiple inventories for the same vehicle (removed duplicate check)

    const newInventory = new Inventory({
      vehicleId,
      registrationNumber: vehicle.registration_number || 'N/A',
      customerName: vehicle.customer_name || 'N/A',
      make: vehicle.make || 'N/A',
      chasisNumber: vehicle.chasis_number || 'N/A',
      engineNumber: vehicle.engine_number || 'N/A',
      fieldAgentId: req.user._id,
      fieldAgentName: req.user.name,
              fieldAgentPhone: req.user.phone, // Using actual phone number
      adminId: fieldAgent.createdBy._id,
      adminName: fieldAgent.createdBy.name,
      driverName,
      driverNumber,
      speedMeterReading: speedMeterReading || undefined,
      originalRCBook: originalRCBook || undefined,
      insurancePolicyUpto: insurancePolicyUpto ? new Date(insurancePolicyUpto) : undefined,
      parkingYardName: parkingYardName || undefined,
      parkingExpensesPerDay: parkingExpensesPerDay || undefined,
      keyAvailability: keyAvailability || undefined,
      tyreConditionFront: tyreConditionFront || undefined,
      tyreConditionRear: tyreConditionRear || undefined,
      tyreMake: tyreMake || undefined,
      bodyType: bodyType || undefined,
      bodyCondition: bodyCondition || undefined,
      numberOfWheels: numberOfWheels || undefined,
      airConditioner: airConditioner || undefined,
      jockeyWithRod: jockeyWithRod || undefined,
      toolSet: toolSet || undefined,
      rearViewMirror: rearViewMirror || undefined,
      stephnee: stephnee || undefined,
      tarpaulinRope: tarpaulinRope || undefined,
      tutorAmplifier: tutorAmplifier || undefined,
      stereoSet: stereoSet || undefined,
      battery: battery || undefined,
      seatCovers: seatCovers || undefined,
      wiper: wiper || undefined,
      otherSpecificItems: otherSpecificItems || undefined
    });

    await newInventory.save();

    res.status(201).json({
      success: true,
      message: 'Inventory created successfully',
      data: newInventory
    });
  } catch (error) {
    console.error('Error creating inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get single inventory by ID
router.get('/:id', authenticateToken, authorizeRole('fieldAgent', 'admin', 'auditor'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const inventory = await Inventory.findById(id)
      .populate('vehicleId', 'registration_number customer_name make chasis_number engine_number')
      .populate('fieldAgentId', 'name email')
      .populate('adminId', 'name');
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found'
      });
    }

    // Check access permissions based on user role
    let hasAccess = false;

    if (req.user.role === 'fieldAgent') {
      // Field agents can only view their own inventories
      hasAccess = inventory.fieldAgentId._id.toString() === req.user._id.toString();
    } else if (req.user.role === 'admin') {
      // Admins can view inventories from their field agents
      const fieldAgent = await User.findById(inventory.fieldAgentId._id);
      hasAccess = fieldAgent && fieldAgent.createdBy.toString() === req.user._id.toString();
    } else if (req.user.role === 'auditor') {
      // Auditors can view inventories from their admin's field agents
      const user = await User.findById(req.user._id).populate('createdBy');
      const fieldAgent = await User.findById(inventory.fieldAgentId._id);
      hasAccess = user.createdBy && fieldAgent && fieldAgent.createdBy.toString() === user.createdBy._id.toString();
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Download inventory as PDF
router.get('/:id/download', authenticateToken, authorizeRole('fieldAgent', 'admin', 'auditor'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const inventory = await Inventory.findById(id)
      .populate('vehicleId', 'registration_number customer_name make chasis_number engine_number')
      .populate('fieldAgentId', 'name email')
      .populate('adminId', 'name');
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found'
      });
    }

    // Check access permissions based on user role
    let hasAccess = false;

    if (req.user.role === 'fieldAgent') {
      // Field agents can only download their own inventories
      hasAccess = inventory.fieldAgentId._id.toString() === req.user._id.toString();
    } else if (req.user.role === 'admin') {
      // Admins can download inventories from their field agents
      const fieldAgent = await User.findById(inventory.fieldAgentId._id);
      hasAccess = fieldAgent && fieldAgent.createdBy.toString() === req.user._id.toString();
    } else if (req.user.role === 'auditor') {
      // Auditors can download inventories from their admin's field agents
      const user = await User.findById(req.user._id).populate('createdBy');
      const fieldAgent = await User.findById(inventory.fieldAgentId._id);
      hasAccess = user.createdBy && fieldAgent && fieldAgent.createdBy.toString() === user.createdBy._id.toString();
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Generate HTML content for the PDF
    const htmlContent = generateInventoryHTML(inventory);

         // Launch Puppeteer and generate PDF
     let browser;
     try {
       console.log('Launching Puppeteer...');
       browser = await puppeteer.launch({
         headless: 'new',
         args: [
           '--no-sandbox',
           '--disable-setuid-sandbox',
           '--disable-dev-shm-usage',
           '--disable-gpu',
           '--no-first-run',
           '--disable-web-security',
           '--disable-features=VizDisplayCompositor',
           '--disable-background-timer-throttling',
           '--disable-backgrounding-occluded-windows',
           '--disable-renderer-backgrounding',
           '--disable-extensions',
           '--disable-plugins',
           '--disable-images',
           '--run-all-compositor-stages-before-draw',
           '--disable-ipc-flooding-protection'
         ],
         timeout: 60000
       });

            console.log('Creating new page...');
      const page = await browser.newPage();
      
      // Set viewport and other page settings
      await page.setViewport({
        width: 1200,
        height: 800,
        deviceScaleFactor: 1
      });

      // Set longer timeout for navigation
      page.setDefaultTimeout(60000);
      page.setDefaultNavigationTimeout(60000);

      console.log('Setting HTML content...');
      console.log('HTML content length:', htmlContent.length);
      
      // Set content with proper waiting
      await page.setContent(htmlContent, { 
        waitUntil: ['load', 'domcontentloaded', 'networkidle0'],
        timeout: 60000 
      });
      
      console.log('Waiting for page to be ready...');
      
      // Wait for any CSS to be applied
      await page.waitForFunction(() => {
        return document.readyState === 'complete';
      }, { timeout: 30000 });

      // Additional wait for rendering
      await page.evaluate(() => {
        return new Promise(resolve => {
          if (document.readyState === 'complete') {
            setTimeout(resolve, 2000); // Wait 2 seconds for CSS to apply
          } else {
            window.addEventListener('load', () => {
              setTimeout(resolve, 2000);
            });
          }
        });
      });
       
       console.log('Generating PDF...');
       // Generate PDF with enhanced options
               const pdfBuffer = await page.pdf({
          format: 'A4',
          margin: {
            top: '5mm',
            right: '5mm',
            bottom: '5mm',
            left: '5mm'
          },
          printBackground: true,
          displayHeaderFooter: false,
          preferCSSPageSize: false,
          timeout: 60000,
          // Add these options for better PDF generation
          omitBackground: false,
          tagged: false,
          scale: 0.85
        });

      // Verify PDF buffer is not empty
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Generated PDF is empty');
      }

      console.log(`PDF generated successfully. Size: ${pdfBuffer.length} bytes`);

      // Validate PDF by checking magic bytes (raw byte values)
      const pdfMagicBytes = pdfBuffer.slice(0, 4);
      const rawBytes = Array.from(pdfMagicBytes);
      console.log('PDF magic bytes check - Raw bytes:', rawBytes);
      
      // Check raw byte values: % = 37, P = 80, D = 68, F = 70
      if (rawBytes[0] !== 37 || rawBytes[1] !== 80 || rawBytes[2] !== 68 || rawBytes[3] !== 70) {
        console.error('Invalid PDF magic bytes. Expected: [37,80,68,70] (%PDF), Got:', rawBytes);
        throw new Error('Generated file is not a valid PDF');
      }
      
      console.log('PDF validation passed - valid PDF file generated');

      // Set response headers for PDF download
      const filename = `inventory-${inventory.inventoryNumber || inventory._id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.setHeader('Cache-Control', 'no-cache');
      
      // Send the PDF buffer using res.end() for binary data
      return res.end(pdfBuffer);

    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      
      // Fallback: Return HTML content for debugging
      console.log('Sending HTML fallback. Content length:', htmlContent.length);
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="inventory-${inventory.inventoryNumber}.html"`);
      res.send(htmlContent);
      
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('Error closing browser:', closeError);
        }
      }
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF'
    });
  }
});

// Enhanced test endpoint with better debugging
router.get('/test-pdf-advanced', async (req, res) => {
  let browser;
  
  try {
    console.log('Starting advanced PDF test...');
    
    // Create mock inventory data
    const mockInventory = {
      inventoryNumber: 'TEST-001',
      adminName: 'Test Admin',
      fieldAgentName: 'Test Field Agent',
      fieldAgentPhone: '1234567890',
      seizureDate: new Date(),
      registrationNumber: 'TEST123',
      customerName: 'Test Customer',
      make: 'Test Make',
      chasisNumber: 'TESTCHASSIS123',
      engineNumber: 'TESTENGINE123',
      driverName: 'Test Driver',
      driverNumber: '9876543210',
      speedMeterReading: '50000',
      originalRCBook: 'Available',
      createdAt: new Date(),
      _id: 'test123'
    };

    // Generate HTML
    const htmlContent = generateInventoryHTML(mockInventory);
    console.log('HTML content generated, length:', htmlContent.length);

    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      timeout: 30000
    });

    const page = await browser.newPage();
    
    // Set content
    await page.setContent(htmlContent, { 
      waitUntil: ['load', 'domcontentloaded'],
      timeout: 30000 
    });

    // Wait for rendering
    await page.waitForFunction(() => document.readyState === 'complete');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      printBackground: true,
      timeout: 30000
    });

    console.log('Test PDF generated. Size:', pdfBuffer.length);

    // Validate PDF
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Test PDF buffer is empty');
    }

    const magicBytes = pdfBuffer.slice(0, 4);
    console.log('PDF magic bytes:', magicBytes.toString());

    if (magicBytes.toString() !== '%PDF') {
      throw new Error('Invalid PDF format - magic bytes check failed');
    }

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test-advanced.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    
    return res.end(pdfBuffer);

  } catch (error) {
    console.error('Advanced test error:', error);
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Advanced PDF test failed: ' + error.message,
        stack: error.stack
      });
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing test browser:', closeError);
      }
    }
  }
});

// Debugging endpoint to check Puppeteer installation
router.get('/debug-puppeteer', async (req, res) => {
  try {
    const puppeteerInfo = {
      version: require('puppeteer/package.json').version,
      executablePath: puppeteer.executablePath(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      chromeRevision: require('puppeteer/package.json').puppeteer.chromium_revision
    };

    // Test basic browser launch
    try {
      const browser = await puppeteer.launch({ 
        headless: 'new',
        timeout: 10000
      });
      const version = await browser.version();
      await browser.close();
      puppeteerInfo.browserVersion = version;
      puppeteerInfo.launchTest = 'SUCCESS';
    } catch (launchError) {
      puppeteerInfo.launchTest = 'FAILED';
      puppeteerInfo.launchError = launchError.message;
    }

    res.json({
      success: true,
      data: puppeteerInfo
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

// Test endpoint to verify Puppeteer is working (no auth required)
router.get('/test-puppeteer', async (req, res) => {
  try {
    console.log('Testing Puppeteer...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      executablePath: process.platform === 'win32' ? undefined : undefined
    });

    const page = await browser.newPage();
    await page.setContent('<html><body><h1>Test PDF</h1><p>This is a test PDF generated by Puppeteer.</p></body></html>');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated test PDF is empty');
    }

    console.log('Test PDF generated successfully. Size:', pdfBuffer.length);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Puppeteer test error:', error);
    res.status(500).json({
      success: false,
      message: 'Puppeteer test failed: ' + error.message
    });
  }
});

// Test endpoint to verify HTML generation is working (no auth required)
router.get('/test-html', async (req, res) => {
  try {
    console.log('Testing HTML generation...');
    
    // Create a mock inventory object for testing
    const mockInventory = {
      inventoryNumber: 'TEST-001',
      adminName: 'Test Admin',
      fieldAgentName: 'Test Field Agent',
      fieldAgentPhone: '1234567890',
      seizureDate: new Date(),
      registrationNumber: 'TEST123',
      customerName: 'Test Customer',
      make: 'Test Make',
      chasisNumber: 'TESTCHASSIS123',
      engineNumber: 'TESTENGINE123',
      driverName: 'Test Driver',
      driverNumber: '9876543210',
      createdAt: new Date()
    };
    
    const htmlContent = generateInventoryHTML(mockInventory);
    console.log('HTML generated successfully. Length:', htmlContent.length);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', 'attachment; filename="test-inventory.html"');
    res.send(htmlContent);

  } catch (error) {
    console.error('HTML generation test error:', error);
    res.status(500).json({
      success: false,
      message: 'HTML generation test failed: ' + error.message
    });
  }
});

// Export the generateInventoryHTML function for testing
// Alternative PDF generation using html-pdf library
router.get('/:id/download-html-pdf', authenticateToken, authorizeRole('fieldAgent', 'admin', 'auditor'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const inventory = await Inventory.findById(id)
      .populate('vehicleId', 'registration_number customer_name make chasis_number engine_number')
      .populate('fieldAgentId', 'name email')
      .populate('adminId', 'name');
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found'
      });
    }

    // Check access permissions (same logic as main download route)
    let hasAccess = false;

    if (req.user.role === 'fieldAgent') {
      hasAccess = inventory.fieldAgentId._id.toString() === req.user._id.toString();
    } else if (req.user.role === 'admin') {
      const fieldAgent = await User.findById(inventory.fieldAgentId._id);
      hasAccess = fieldAgent && fieldAgent.createdBy.toString() === req.user._id.toString();
    } else if (req.user.role === 'auditor') {
      const user = await User.findById(req.user._id).populate('createdBy');
      const fieldAgent = await User.findById(inventory.fieldAgentId._id);
      hasAccess = user.createdBy && fieldAgent && fieldAgent.createdBy.toString() === user.createdBy._id.toString();
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const htmlContent = generateInventoryHTML(inventory);
    
    const options = {
      format: 'A4',
      border: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      },
      timeout: 30000
    };

    pdf.create(htmlContent, options).toBuffer((err, buffer) => {
      if (err) {
        console.error('html-pdf error:', err);
        return res.status(500).json({
          success: false,
          message: 'PDF generation failed'
        });
      }

      const filename = `inventory-${inventory.inventoryNumber || inventory._id}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length.toString());
      
      res.end(buffer);
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Fallback PDF generation with HTML download option
router.get('/:id/download-fallback', authenticateToken, authorizeRole('fieldAgent', 'admin', 'auditor'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const inventory = await Inventory.findById(id)
      .populate('vehicleId', 'registration_number customer_name make chasis_number engine_number')
      .populate('fieldAgentId', 'name email')
      .populate('adminId', 'name');
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Inventory not found'
      });
    }

    // Check access permissions (same logic as main download route)
    let hasAccess = false;

    if (req.user.role === 'fieldAgent') {
      hasAccess = inventory.fieldAgentId._id.toString() === req.user._id.toString();
    } else if (req.user.role === 'admin') {
      const fieldAgent = await User.findById(inventory.fieldAgentId._id);
      hasAccess = fieldAgent && fieldAgent.createdBy.toString() === req.user._id.toString();
    } else if (req.user.role === 'auditor') {
      const user = await User.findById(req.user._id).populate('createdBy');
      const fieldAgent = await User.findById(inventory.fieldAgentId._id);
      hasAccess = user.createdBy && fieldAgent && fieldAgent.createdBy.toString() === user.createdBy._id.toString();
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const htmlContent = generateInventoryHTML(inventory);
    
    // Try PDF generation first
    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 15000 // Shorter timeout for fallback
      });

      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'load', timeout: 10000 });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true,
        timeout: 10000
      });

      await browser.close();

      if (pdfBuffer && pdfBuffer.length > 0) {
        const filename = `inventory-${inventory.inventoryNumber || inventory._id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.end(pdfBuffer);
      }

    } catch (pdfError) {
      console.log('PDF generation failed, falling back to HTML:', pdfError.message);
    }

    // Fallback to HTML download
    const filename = `inventory-${inventory.inventoryNumber || inventory._id}.html`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', Buffer.byteLength(htmlContent, 'utf8'));
    res.send(htmlContent);

  } catch (error) {
    console.error('Fallback error:', error);
    res.status(500).json({
      success: false,
      message: 'Both PDF and HTML generation failed'
    });
  }
});

module.exports = {
  router,
  generateInventoryHTML
};
