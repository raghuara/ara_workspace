const departmentModel = require("../models/department.model");
const { withTransaction } = require("../utils/transaction");

const text = (value) => (typeof value === "string" ? value.trim() : "");

const mapDepartment = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description ?? "",
  isActive: Boolean(row.is_active),
  employeeCount: row.employee_count
});

const notFound = (res) => res.status(404).json({ message: "That department does not exist.", code: "NOT_FOUND" });

const duplicate = (res) =>
  res.status(409).json({
    message: "A department with this name already exists.",
    code: "DUPLICATE_NAME",
    errors: { name: "This name is already in use." }
  });

const listDepartments = async (req, res) => {
  const rows = await departmentModel.findAllDepartments();
  const activeOnly = req.query.active === "true";
  res.json(rows.filter((row) => !activeOnly || row.is_active).map(mapDepartment));
};

const createDepartment = async (req, res) => {
  const name = text(req.body.name).slice(0, 80);
  if (!name) {
    return res.status(400).json({
      message: "Please fix the highlighted fields.",
      code: "VALIDATION_ERROR",
      errors: { name: "Department name is required." }
    });
  }

  try {
    const id = await departmentModel.insertDepartment({
      name,
      description: text(req.body.description).slice(0, 255) || null,
      isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive)
    });
    return res.status(201).json(mapDepartment(await departmentModel.findDepartmentById(id)));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return duplicate(res);
    throw error;
  }
};

const updateDepartment = async (req, res) => {
  const existing = await departmentModel.findDepartmentById(req.params.id);
  if (!existing) return notFound(res);

  const name = req.body.name === undefined ? existing.name : text(req.body.name).slice(0, 80);
  if (!name) {
    return res.status(400).json({
      message: "Please fix the highlighted fields.",
      code: "VALIDATION_ERROR",
      errors: { name: "Department name is required." }
    });
  }

  const data = {
    name,
    description: req.body.description === undefined ? existing.description : text(req.body.description).slice(0, 255) || null,
    isActive: req.body.isActive === undefined ? Boolean(existing.is_active) : Boolean(req.body.isActive)
  };

  try {
    await withTransaction(async (connection) => {
      await departmentModel.updateDepartment(existing.id, data, connection);
      if (name !== existing.name) await departmentModel.renameOnEmployees(existing.name, name, connection);
    });
    return res.json(mapDepartment(await departmentModel.findDepartmentById(existing.id)));
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return duplicate(res);
    throw error;
  }
};

const deleteDepartment = async (req, res) => {
  const existing = await departmentModel.findDepartmentById(req.params.id);
  if (!existing) return notFound(res);

  if (existing.employee_count > 0) {
    return res.status(400).json({
      message: `${existing.employee_count} employee(s) are in this department. Move them first, or mark the department inactive instead.`,
      code: "BAD_REQUEST"
    });
  }

  await departmentModel.deleteDepartment(existing.id);
  res.json({ id: existing.id });
};

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment
};
