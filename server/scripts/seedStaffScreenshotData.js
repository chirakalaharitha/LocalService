const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const Municipality = require('../models/Municipality');
const Department = require('../models/Department');
const Request = require('../models/Request');
const ActivityLog = require('../models/ActivityLog');

const seedStaffData = async () => {
  try {
    await connectDB();
    console.log('[Seed] Connected to MongoDB.');

    // 1. Find or create Municipalities
    let gmc = await Municipality.findOne({ code: 'GMC' });
    let tnl = await Municipality.findOne({ code: 'TNL' });
    let rpl = await Municipality.findOne({ code: 'RPL' });
    let stp = await Municipality.findOne({ code: 'STP' });

    if (!gmc) gmc = await Municipality.create({ name: 'Guntur Municipal Corporation', code: 'GMC', city: 'Guntur', district: 'Guntur', state: 'Andhra Pradesh', isActive: true });
    if (!tnl) tnl = await Municipality.create({ name: 'Tenali Municipality', code: 'TNL', city: 'Tenali', district: 'Guntur', state: 'Andhra Pradesh', isActive: true });
    if (!rpl) rpl = await Municipality.create({ name: 'Repalle Municipality', code: 'RPL', city: 'Repalle', district: 'Guntur', state: 'Andhra Pradesh', isActive: true });
    if (!stp) stp = await Municipality.create({ name: 'Sattenapalle Municipality', code: 'STP', city: 'Sattenapalli', district: 'Guntur', state: 'Andhra Pradesh', isActive: true });

    // 2. Find or create Departments
    let waterDept = await Department.findOne({ code: 'WTR' });
    let electDept = await Department.findOne({ code: 'ELE' });
    let roadDept = await Department.findOne({ code: 'ROA' });
    let sanDept = await Department.findOne({ code: 'SAN' });
    let parkDept = await Department.findOne({ code: 'PRK' });

    if (!waterDept) waterDept = await Department.create({ name: 'Water Works & Drainage', code: 'WTR', municipality: gmc._id, isActive: true });
    if (!electDept) electDept = await Department.create({ name: 'Electrical & Lighting', code: 'ELE', municipality: gmc._id, isActive: true });
    if (!roadDept) roadDept = await Department.create({ name: 'Roads & Infrastructure', code: 'ROA', municipality: gmc._id, isActive: true });
    if (!sanDept) sanDept = await Department.create({ name: 'Public Health & Sanitation', code: 'SAN', municipality: gmc._id, isActive: true });
    if (!parkDept) parkDept = await Department.create({ name: 'Parks & Recreation', code: 'PRK', municipality: gmc._id, isActive: true });

    // 3. Find or create Ramesh Kumar (Staff) and Harini (Staff)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    let ramesh = await User.findOne({ email: 'ramesh.kumar@localfix.gov.in' });
    if (!ramesh) {
      ramesh = await User.create({
        name: 'Ramesh Kumar',
        email: 'ramesh.kumar@localfix.gov.in',
        phone: '9848012345',
        password: hashedPassword,
        role: 'STAFF',
        municipality: gmc._id,
        isVerified: true,
        isActive: true
      });
      console.log('[Seed] Created staff user Ramesh Kumar (ramesh.kumar@localfix.gov.in)');
    } else {
      ramesh.role = 'STAFF';
      ramesh.isActive = true;
      ramesh.municipality = gmc._id;
      await ramesh.save();
    }

    let harini = await User.findOne({ email: 'harinigolla681@gmail.com' });
    if (harini) {
      harini.role = 'STAFF';
      harini.isActive = true;
      await harini.save();
    }

    // Citizen user for requests
    let citizen = await User.findOne({ role: 'CITIZEN' });
    if (!citizen) {
      citizen = await User.create({
        name: 'Jyothsna',
        email: 'chjyothsna50@gmail.com',
        phone: '9848054321',
        password: hashedPassword,
        role: 'CITIZEN',
        municipality: gmc._id,
        isVerified: true
      });
    }

    // 4. Create or update the 24 specific requests
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const staffIds = [ramesh._id];
    if (harini) staffIds.push(harini._id);

    const requestDefs = [
      // 1. Water leakage near main road
      {
        requestId: 'LF-2025-0048',
        title: 'Water leakage near main road',
        description: 'Major water pipeline rupture causing pool near main road intersection.',
        category: 'WATER',
        locationStr: 'Tenali, Guntur',
        municipalityId: tnl._id,
        deptId: waterDept._id,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(now + 2 * oneDay),
        assignedAt: new Date(now - 1 * oneDay),
        createdAt: new Date(now - 2 * oneDay)
      },
      // 2. Streetlight not working
      {
        requestId: 'LF-2025-0047',
        title: 'Streetlight not working',
        description: 'Two consecutive pole fixtures are defective and flickering continuously.',
        category: 'STREET_LIGHT',
        locationStr: 'Guntur',
        municipalityId: gmc._id,
        deptId: electDept._id,
        priority: 'MEDIUM',
        status: 'ASSIGNED',
        slaDeadline: new Date(now + 3 * oneDay),
        assignedAt: new Date(now - 1.5 * oneDay),
        createdAt: new Date(now - 2 * oneDay)
      },
      // 3. Road pothole
      {
        requestId: 'LF-2025-0046',
        title: 'Road pothole',
        description: 'Dangerous pothole cluster near Repalle bus station requiring urgent asphalt patch.',
        category: 'ROAD',
        locationStr: 'Repalle, Guntur',
        municipalityId: rpl._id,
        deptId: roadDept._id,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(now + 1 * oneDay),
        assignedAt: new Date(now - 2 * oneDay),
        createdAt: new Date(now - 3 * oneDay)
      },
      // 4. Garbage not collected
      {
        requestId: 'LF-2025-0045',
        title: 'Garbage not collected',
        description: 'Municipal trash bin overflow in commercial center. Sanitation sweep required.',
        category: 'GARBAGE',
        locationStr: 'Sattenapalli',
        municipalityId: stp._id,
        deptId: sanDept._id,
        priority: 'LOW',
        status: 'PENDING',
        slaDeadline: new Date(now + 5 * oneDay),
        assignedAt: new Date(now - 1 * oneDay),
        createdAt: new Date(now - 2 * oneDay)
      },
      // 5. Park maintenance
      {
        requestId: 'LF-2025-0044',
        title: 'Park maintenance',
        description: 'Broken sprinkler heads and overgrown walkway clearing completed by landscape crew.',
        category: 'PUBLIC_AREA',
        locationStr: 'Guntur',
        municipalityId: gmc._id,
        deptId: parkDept._id,
        priority: 'MEDIUM',
        status: 'RESOLVED',
        slaDeadline: new Date(now - 1 * oneDay),
        assignedAt: new Date(now - 4 * oneDay),
        createdAt: new Date(now - 5 * oneDay)
      },
      // 6. Overdue request LF-2025-0043
      {
        requestId: 'LF-2025-0043',
        title: 'Sewage drain blockage on 4th lane',
        description: 'Drain backup flooding residential alley. SLA breached.',
        category: 'DRAINAGE',
        locationStr: 'Arundelpet, Guntur',
        municipalityId: gmc._id,
        deptId: waterDept._id,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(now - 2 * 60 * 60 * 1000), // Overdue by 2 hours
        assignedAt: new Date(now - 3 * oneDay),
        createdAt: new Date(now - 4 * oneDay)
      },
      // 7. Overdue request LF-2025-0042
      {
        requestId: 'LF-2025-0042',
        title: 'High tension cable sagging near school',
        description: 'Hazardous overhead cable drooping close to pavement.',
        category: 'ELECTRICITY',
        locationStr: 'Brodipet, Guntur',
        municipalityId: gmc._id,
        deptId: electDept._id,
        priority: 'CRITICAL',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(now - 12 * 60 * 60 * 1000), // Overdue
        assignedAt: new Date(now - 2 * oneDay),
        createdAt: new Date(now - 3 * oneDay)
      },
      // Additional In Progress (to total 8 in progress)
      {
        requestId: 'LF-2025-0041',
        title: 'Broken water valve near reservoir',
        description: 'Supply valve pressure leak needing replacement seal.',
        category: 'WATER',
        locationStr: 'Tenali, Guntur',
        municipalityId: tnl._id,
        deptId: waterDept._id,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(now + 2.5 * oneDay),
        assignedAt: new Date(now - 1 * oneDay),
        createdAt: new Date(now - 2 * oneDay)
      },
      {
        requestId: 'LF-2025-0040',
        title: 'Asphalt resurfacing on Market Road',
        description: 'Surface cracking filling and steam-rolling underway.',
        category: 'ROAD',
        locationStr: 'Repalle, Guntur',
        municipalityId: rpl._id,
        deptId: roadDept._id,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(now + 1.8 * oneDay),
        assignedAt: new Date(now - 1 * oneDay),
        createdAt: new Date(now - 2 * oneDay)
      },
      {
        requestId: 'LF-2025-0039',
        title: 'Fallen tree limb blocking lane',
        description: 'Tree trunk cut and clearing crew operating woodchipper.',
        category: 'PUBLIC_AREA',
        locationStr: 'Guntur',
        municipalityId: gmc._id,
        deptId: parkDept._id,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(now + 3 * oneDay),
        assignedAt: new Date(now - 1 * oneDay),
        createdAt: new Date(now - 2 * oneDay)
      },
      // Additional Pending / Assigned (to total 6 Pending + 1 Assigned)
      {
        requestId: 'LF-2025-0038',
        title: 'Stormwater culvert silt removal',
        description: 'Pre-monsoon desilting needed along culvert span.',
        category: 'DRAINAGE',
        locationStr: 'Sattenapalli',
        municipalityId: stp._id,
        deptId: waterDept._id,
        priority: 'LOW',
        status: 'PENDING',
        slaDeadline: new Date(now + 4 * oneDay),
        assignedAt: new Date(now - 0.5 * oneDay),
        createdAt: new Date(now - 1 * oneDay)
      },
      {
        requestId: 'LF-2025-0037',
        title: 'Streetlight pole tilted after collision',
        description: 'Vehicle impact bent lighting standard base.',
        category: 'STREET_LIGHT',
        locationStr: 'Tenali, Guntur',
        municipalityId: tnl._id,
        deptId: electDept._id,
        priority: 'MEDIUM',
        status: 'PENDING',
        slaDeadline: new Date(now + 3.5 * oneDay),
        assignedAt: new Date(now - 0.5 * oneDay),
        createdAt: new Date(now - 1 * oneDay)
      },
      {
        requestId: 'LF-2025-0036',
        title: 'Accumulated construction debris on sidewalk',
        description: 'Sidewalk obstructed by discarded masonry and tiles.',
        category: 'GARBAGE',
        locationStr: 'Guntur',
        municipalityId: gmc._id,
        deptId: sanDept._id,
        priority: 'LOW',
        status: 'PENDING',
        slaDeadline: new Date(now + 4.5 * oneDay),
        assignedAt: new Date(now - 0.2 * oneDay),
        createdAt: new Date(now - 0.8 * oneDay)
      },
      {
        requestId: 'LF-2025-0035',
        title: 'Public water tap missing tap head',
        description: 'Constant tap flow wasting municipal supply water.',
        category: 'WATER',
        locationStr: 'Repalle, Guntur',
        municipalityId: rpl._id,
        deptId: waterDept._id,
        priority: 'MEDIUM',
        status: 'PENDING',
        slaDeadline: new Date(now + 2.8 * oneDay),
        assignedAt: new Date(now - 0.3 * oneDay),
        createdAt: new Date(now - 0.5 * oneDay)
      },
      {
        requestId: 'LF-2025-0034',
        title: 'Open manhole cover replacement',
        description: 'Missing cast iron grate replaced with warning cone.',
        category: 'DRAINAGE',
        locationStr: 'Sattenapalli',
        municipalityId: stp._id,
        deptId: roadDept._id,
        priority: 'HIGH',
        status: 'PENDING',
        slaDeadline: new Date(now + 1.2 * oneDay),
        assignedAt: new Date(now - 0.1 * oneDay),
        createdAt: new Date(now - 0.4 * oneDay)
      },
      // Additional Resolved / Completed (to total 7 completed)
      {
        requestId: 'LF-2025-0033',
        title: 'Repaired drinking fountain in Gandhi Park',
        description: 'Fountain valve renewed and water pressure tested.',
        category: 'PUBLIC_AREA',
        locationStr: 'Guntur',
        municipalityId: gmc._id,
        deptId: parkDept._id,
        priority: 'LOW',
        status: 'RESOLVED',
        slaDeadline: new Date(now - 1 * oneDay),
        assignedAt: new Date(now - 6 * oneDay),
        createdAt: new Date(now - 7 * oneDay)
      },
      {
        requestId: 'LF-2025-0032',
        title: 'Restored transformer junction box latch',
        description: 'Junction box locked and certified safe for pedestrian zone.',
        category: 'ELECTRICITY',
        locationStr: 'Tenali, Guntur',
        municipalityId: tnl._id,
        deptId: electDept._id,
        priority: 'HIGH',
        status: 'RESOLVED',
        slaDeadline: new Date(now - 1 * oneDay),
        assignedAt: new Date(now - 5 * oneDay),
        createdAt: new Date(now - 6 * oneDay)
      },
      {
        requestId: 'LF-2025-0031',
        title: 'Commercial zone nighttime waste clearance',
        description: 'Full sanitary bin emptied and power washed.',
        category: 'GARBAGE',
        locationStr: 'Guntur',
        municipalityId: gmc._id,
        deptId: sanDept._id,
        priority: 'MEDIUM',
        status: 'RESOLVED',
        slaDeadline: new Date(now - 1 * oneDay),
        assignedAt: new Date(now - 4 * oneDay),
        createdAt: new Date(now - 5 * oneDay)
      },
      {
        requestId: 'LF-2025-0030',
        title: 'Pavement paver block re-leveling',
        description: 'Uneven brick walkway reconstructed and leveled.',
        category: 'ROAD',
        locationStr: 'Repalle, Guntur',
        municipalityId: rpl._id,
        deptId: roadDept._id,
        priority: 'LOW',
        status: 'RESOLVED',
        slaDeadline: new Date(now - 1 * oneDay),
        assignedAt: new Date(now - 7 * oneDay),
        createdAt: new Date(now - 8 * oneDay)
      },
      {
        requestId: 'LF-2025-0029',
        title: 'Cleared underground stormwater drain',
        description: 'High-pressure water jet cleared root obstruction in drain.',
        category: 'DRAINAGE',
        locationStr: 'Tenali, Guntur',
        municipalityId: tnl._id,
        deptId: waterDept._id,
        priority: 'MEDIUM',
        status: 'RESOLVED',
        slaDeadline: new Date(now - 1 * oneDay),
        assignedAt: new Date(now - 8 * oneDay),
        createdAt: new Date(now - 9 * oneDay)
      },
      {
        requestId: 'LF-2025-0028',
        title: 'Replaced 4 sodium streetlights with LED fixtures',
        description: 'Energy efficient luminaires installed along Avenue 3.',
        category: 'STREET_LIGHT',
        locationStr: 'Sattenapalli',
        municipalityId: stp._id,
        deptId: electDept._id,
        priority: 'MEDIUM',
        status: 'RESOLVED',
        slaDeadline: new Date(now - 1 * oneDay),
        assignedAt: new Date(now - 9 * oneDay),
        createdAt: new Date(now - 10 * oneDay)
      },
      // 2 more requests to make 24
      {
        requestId: 'LF-2025-0027',
        title: 'Repaired underground main pipe collar',
        description: 'Excavation completed and reinforced collar installed.',
        category: 'WATER',
        locationStr: 'Guntur',
        municipalityId: gmc._id,
        deptId: waterDept._id,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(now + 1.5 * oneDay),
        assignedAt: new Date(now - 1 * oneDay),
        createdAt: new Date(now - 2 * oneDay)
      },
      {
        requestId: 'LF-2025-0026',
        title: 'Public bench repair in Municipal Gardens',
        description: 'Repainted cast iron slats and bolted bench to concrete base.',
        category: 'PUBLIC_AREA',
        locationStr: 'Tenali, Guntur',
        municipalityId: tnl._id,
        deptId: parkDept._id,
        priority: 'LOW',
        status: 'RESOLVED',
        slaDeadline: new Date(now - 1 * oneDay),
        assignedAt: new Date(now - 11 * oneDay),
        createdAt: new Date(now - 12 * oneDay)
      }
    ];

    // Seed requests
    for (const rDef of requestDefs) {
      const existing = await Request.findOne({ requestId: rDef.requestId });
      const docData = {
        requestId: rDef.requestId,
        title: rDef.title,
        description: rDef.description,
        category: rDef.category,
        priority: rDef.priority,
        status: rDef.status,
        citizen: citizen._id,
        assignedStaff: ramesh._id,
        assignedTo: ramesh._id,
        department: rDef.deptId,
        municipality: rDef.municipalityId,
        address: rDef.locationStr,
        location: {
          type: 'Point',
          coordinates: [80.4365 + (Math.random() - 0.5) * 0.1, 16.3067 + (Math.random() - 0.5) * 0.1]
        },
        slaDeadline: rDef.slaDeadline,
        createdAt: rDef.createdAt,
        updatedAt: rDef.assignedAt
      };

      if (existing) {
        Object.assign(existing, docData);
        await existing.save();
      } else {
        await Request.create(docData);
      }
    }

    console.log(`[Seed] Successfully seeded/updated ${requestDefs.length} assigned requests!`);

    // 5. Seed Activity Logs matching screenshot:
    // - Request LF-2025-0048 updated to In Progress (10 minutes ago)
    // - New request assigned to you (32 minutes ago)
    // - Request LF-2025-0046 resolved (1 hour ago)
    // - SLA overdue for LF-2025-0043 (2 hours ago)
    await ActivityLog.deleteMany({ targetType: 'StaffActivitySeed' });
    await ActivityLog.create([
      {
        action: 'STATUS_UPDATED',
        description: 'Request LF-2025-0048 updated to In Progress',
        user: ramesh._id,
        targetId: 'LF-2025-0048',
        targetType: 'StaffActivitySeed',
        createdAt: new Date(now - 10 * 60 * 1000)
      },
      {
        action: 'REQUEST_ASSIGNED',
        description: 'New request assigned to you',
        user: ramesh._id,
        targetId: 'LF-2025-0047',
        targetType: 'StaffActivitySeed',
        createdAt: new Date(now - 32 * 60 * 1000)
      },
      {
        action: 'REQUEST_RESOLVED',
        description: 'Request LF-2025-0046 resolved',
        user: ramesh._id,
        targetId: 'LF-2025-0046',
        targetType: 'StaffActivitySeed',
        createdAt: new Date(now - 60 * 60 * 1000)
      },
      {
        action: 'SLA_BREACH',
        description: 'SLA overdue for LF-2025-0043',
        user: ramesh._id,
        targetId: 'LF-2025-0043',
        targetType: 'StaffActivitySeed',
        createdAt: new Date(now - 120 * 60 * 1000)
      }
    ]);

    console.log('[Seed] Seeded matching activity logs!');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedStaffData();
