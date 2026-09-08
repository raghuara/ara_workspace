import { Skeleton, TableBody, TableCell, TableRow } from '@mui/material'

export const TableSkeleton = ({ rows = 6, columns = 5 }) => (
  <TableBody>
    {Array.from({ length: rows }, (_, rowIndex) => (
      <TableRow key={rowIndex}>
        {Array.from({ length: columns }, (_, columnIndex) => (
          <TableCell key={columnIndex}>
            <Skeleton variant="text" width={columnIndex === 0 ? '70%' : '55%'} height={22} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </TableBody>
)
