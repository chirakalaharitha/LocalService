const Department = require('../models/Department');
const Request = require('../models/Request');
const User = require('../models/User');

// @desc    Get all active departments (Public or Municipal-scoped)
// @route   GET /api/departments
// @access  Public / Private
const getDepartments = async (req, res, next) => {
  try {
    const filter = { isActive: true };
    const muniId = req.user?.municipality;
    if (muniId) {
      filter.$or = [
        { municipality: muniId },
        { municipality: { $exists: false } },
        { municipality: null }
      ];
    }

    const departments = await Department.find(filter).sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: departments.length,
      departments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all departments for Admin (including inactive & municipality-scoped staff/request count)
// @route   GET /api/departments/admin
// @access  Private (ADMIN)
const getAdminDepartments = async (req, res, next) => {
  try {
    const muniId = req.user?.municipality;
    const deptFilter = {};
    if (muniId) {
      deptFilter.$or = [
        { municipality: muniId },
        { municipality: { $exists: false } },
        { municipality: null }
      ];
    }

    const departments = await Department.find(deptFilter).sort({ name: 1 });
    const deptData = await Promise.all(
      departments.map(async (d) => {
        const staffQuery = { department: d._id, role: 'STAFF' };
        const reqQuery = { department: d._id };
        const activeReqQuery = {
          department: d._id,
          status: { $nin: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'REJECTED'] }
        };

        if (muniId) {
          staffQuery.municipality = muniId;
          reqQuery.municipality = muniId;
          activeReqQuery.municipality = muniId;
        }

        const staffCount = await User.countDocuments(staffQuery);
        const requestCount = await Request.countDocuments(reqQuery);
        const activeRequestCount = await Request.countDocuments(activeReqQuery);

        const obj = d.toObject();
        obj.staffCount = staffCount;
        obj.requestCount = requestCount;
        obj.activeRequestCount = activeRequestCount;
        return obj;
      })
    );

    res.status(200).json({
      success: true,
      count: deptData.length,
      departments: deptData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new department
// @route   POST /api/departments
// @access  Private (ADMIN)
const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, icon } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and code are required' });
    }

    const cleanCode = code.toUpperCase().trim();
    const cleanName = name.trim();

    const existingDept = await Department.findOne({
      $or: [
        { code: cleanCode },
        { name: { $regex: new RegExp(`^${cleanName}$`, 'i') } }
      ]
    });

    if (existingDept) {
      if (existingDept.code === cleanCode) {
        return res.status(400).json({ success: false, message: 'Department code already in use' });
      }
      return res.status(400).json({ success: false, message: 'Department name already in use' });
    }

    const deptPayload = {
      name: cleanName,
      code: cleanCode,
      description: description ? description.trim() : '',
      icon: icon || 'HiOfficeBuilding',
      isActive: true
    };

    if (req.user?.municipality) {
      deptPayload.municipality = req.user.municipality;
    }

    const dept = await Department.create(deptPayload);

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department: dept
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing department
// @route   PUT /api/departments/:id
// @access  Private (ADMIN)
const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, icon, isActive } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    if (name) dept.name = name.trim();
    if (description !== undefined) dept.description = description.trim();
    if (icon) dept.icon = icon;
    if (isActive !== undefined) dept.isActive = Boolean(isActive);

    await dept.save();

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      department: dept
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle department active/inactive status
// @route   PUT /api/departments/:id/status
// @access  Private (ADMIN)
const toggleDepartmentStatus = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    dept.isActive = !dept.isActive;
    await dept.save();

    res.status(200).json({
      success: true,
      message: `Department ${dept.isActive ? 'activated' : 'deactivated'} successfully`,
      isActive: dept.isActive,
      department: dept
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Safely delete department if no active requests reference it
// @route   DELETE /api/departments/:id
// @access  Private (ADMIN)
const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check active requests
    const activeRequests = await Request.countDocuments({
      department: id,
      status: { $nin: ['RESOLVED', 'CITIZEN_VERIFIED', 'CLOSED', 'REJECTED'] }
    });

    if (activeRequests > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department with ${activeRequests} active request(s). Deactivate the department instead.`
      });
    }

    await dept.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all staff belonging to a department
// @route   GET /api/departments/:id/staff
// @access  Private (ADMIN)
const getDepartmentStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const staffQuery = { department: id, role: 'STAFF' };
    if (req.user?.municipality) {
      staffQuery.municipality = req.user.municipality;
    }

    const staff = await User.find(staffQuery)
      .select('-password')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: staff.length,
      staff
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign a staff user to a department
// @route   POST /api/departments/:id/staff
// @access  Private (ADMIN)
const assignStaffToDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    if (!staffId) {
      return res.status(400).json({ success: false, message: 'staffId is required' });
    }

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff user not found' });
    }

    if (staff.role !== 'STAFF') {
      return res.status(400).json({ success: false, message: 'Selected user does not have the STAFF role' });
    }

    staff.department = dept._id;
    await staff.save();

    res.status(200).json({
      success: true,
      message: `Staff member ${staff.name} successfully assigned to ${dept.name}`,
      staff: {
        _id: staff._id,
        name: staff.name,
        email: staff.email,
        department: dept._id,
        isActive: staff.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove staff user from department
// @route   DELETE /api/departments/:id/staff/:staffId
// @access  Private (ADMIN)
const removeStaffFromDepartment = async (req, res, next) => {
  try {
    const { id, staffId } = req.params;

    const staff = await User.findOne({ _id: staffId, department: id, role: 'STAFF' });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found in this department' });
    }

    staff.department = null;
    await staff.save();

    res.status(200).json({
      success: true,
      message: `Staff member ${staff.name} removed from department`
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  getAdminDepartments,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
  getDepartmentStaff,
  assignStaffToDepartment,
  removeStaffFromDepartment
};

