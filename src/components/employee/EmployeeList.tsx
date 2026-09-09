'use client'
import { useEffect, useState } from 'react'
import ButtonDelete from './buttons/ButtonDelete'
import FetchUser from './actions/FetchUser'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/clientPermissions'

type User = {
  id: string
  name: string | null
  email: string
  emailVerified: Date | null
  image: string | null
  password: string | null
  flag: string | null // 0 = User, 1 = Admin
}

export default function EmployeeList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const { data: session } = useSession()
  const isCurrentUser = session?.user?.email
  const canEdit = hasPermission(session, 'action:edit-employee', 'admin')
  const canDelete = hasPermission(session, 'action:delete-employee', 'admin')

  const getUsers = async () => {
    try {
      setLoading(true)
      const data = await FetchUser()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getUsers()
  }, [])

  return (
    <div className="right-side" style={{ minHeight: '945px' }}>
      <section className="content-header">
        <ol className="breadcrumb">
          <li>
            <a href="#">Employee List</a>
          </li>
          <li>
            <a href="#">Employee Management</a>
          </li>
        </ol>
      </section>

      <br />
      <div className="container-fluid">
        <section className="content">
          <div className="row">
            <div className="col-md-12">
              <div className="box box-primary ">
                <div className="box-header box-header-background with-border">
                  <h3 className="box-title text-center">Manage Employee</h3>
                </div>

                <div className="box-body">
                  <table
                    className="table table-bordered table-striped text-center"
                    id="dataTables-example"
                  >
                    <thead>
                      <tr>
                        <th className="col-sm-1 active text-center">SL</th>
                        <th className="active text-center">Name</th>
                        <th className="col-sm-1 active text-center">Login</th>
                        <th className="col-sm-1 active text-center">User Type</th>
                        <th className="col-sm-2 active text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="text-center">
                            <strong>Loading employees...</strong>
                          </td>
                        </tr>
                      ) : users.length > 0 ? (
                        users.map((user, index) => (
                          <tr key={user.id} className="text-center">
                            <td>{index + 1}</td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.flag === '1' ? 'Admin' : 'User'}</td>
                            <td>
                              <div className="btn-group">
                                {isCurrentUser !== user.email && canDelete && (
                                  <>
                                    <ButtonDelete email={user.email} onSucess={getUsers} />
                                    &nbsp;|&nbsp;
                                  </>
                                )}
                                {canEdit ? (
                                  <Link href={`/dashboard/employee/edit-employee/${user.email}`}>
                                    <button
                                      className="btn bg-navy btn-xs"
                                      title="Edit"
                                      data-toggle="tooltip"
                                      data-placement="top"
                                    >
                                      <i className="glyphicon glyphicon-edit"></i>
                                    </button>
                                  </Link>
                                ) : (
                                  <button className="btn btn-default btn-xs" disabled title="No permission to edit employees">
                                    <i className="glyphicon glyphicon-lock"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center">
                            <strong>No employees found.</strong>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <br />
    </div>
  )
}
